import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Room } from '../models/Room.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { toMinorUnits } from '../utils/pricing.js';
import { activeGateway, gatewayFor } from './paymentGateway.js';
import { releaseInventory, reserveInventory } from './inventoryService.js';
import { sendBookingConfirmedEmail } from './emailService.js';

async function loadOwnedBooking(user, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, user: user._id });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

export async function createOrder(user, bookingId) {
  const booking = await loadOwnedBooking(user, bookingId);
  if (booking.paymentStatus !== 'unpaid') throw ApiError.conflict('This booking has already been paid', { code: 'ALREADY_PAID' });
  if (booking.status !== 'pending') {
    throw ApiError.conflict(`This booking is ${booking.status} and can no longer be paid`, { code: 'INVALID_STATUS' });
  }
  if (booking.expiresAt && booking.expiresAt <= new Date()) {
    throw ApiError.conflict('The hold on this booking has expired. Please start a new booking.', { code: 'BOOKING_EXPIRED' });
  }

  const gateway = activeGateway();
  if (!gateway) throw new ApiError(503, 'Online payments are not configured', { code: 'PAYMENTS_UNAVAILABLE' });

  const amount = booking.pricing.total;
  const currency = booking.pricing.currency;

  // Retrying checkout reuses the open order instead of creating a new one.
  let payment = await Payment.findOne({
    booking: booking._id,
    provider: gateway.name,
    status: { $in: ['created', 'failed'] },
    amount,
  });
  if (!payment) {
    const { orderId } = await gateway.createOrder({
      amountMinor: toMinorUnits(amount),
      currency,
      receipt: booking.reference,
      notes: { bookingId: booking._id.toString(), reference: booking.reference },
    });
    payment = await Payment.create({
      booking: booking._id,
      user: user._id,
      provider: gateway.name,
      orderId,
      amount,
      currency,
    });
  }

  return {
    ...gateway.publicConfig(),
    orderId: payment.orderId,
    amount,
    amountMinor: toMinorUnits(amount),
    currency,
    bookingId: booking._id,
    bookingReference: booking.reference,
    expiresAt: booking.expiresAt,
    prefill: { name: `${booking.guest.firstName} ${booking.guest.lastName}`, email: booking.guest.email, contact: booking.guest.phone },
  };
}

async function onConfirmed(booking) {
  await Room.updateOne({ _id: booking.room }, { $inc: { popularity: booking.rooms } });
  sendBookingConfirmedEmail(booking).catch(() => {});
}

/**
 * Marks a verified payment as captured and confirms its booking. Safe to call
 * any number of times for the same payment (client callback, webhook, retries).
 */
export async function confirmPayment(payment, paymentId, via) {
  let captured = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ['created', 'failed'] } },
    { $set: { status: 'captured', paymentId, verifiedAt: new Date(), verifiedVia: via }, $unset: { failureReason: 1 } },
    { new: true },
  );
  if (!captured) {
    captured = await Payment.findById(payment._id);
    if (captured.paymentId !== paymentId) {
      throw ApiError.conflict('This order has already been settled with a different payment', { code: 'PAYMENT_CONFLICT' });
    }
  }

  const confirmedUpdate = (fromStatus) =>
    Booking.findOneAndUpdate(
      { _id: captured.booking, status: fromStatus, paymentStatus: 'unpaid' },
      {
        $set: { status: 'confirmed', paymentStatus: 'paid', confirmedAt: new Date(), inventoryHeld: true },
        $unset: { expiresAt: 1 },
        $push: { statusHistory: { status: 'confirmed', note: `Payment ${paymentId} verified via ${via}` } },
      },
      { new: true },
    );

  let booking = await confirmedUpdate('pending');
  if (booking) {
    await onConfirmed(booking);
    return { booking, payment: captured, outcome: 'confirmed' };
  }

  booking = await Booking.findById(captured.booking);
  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    return { booking, payment: captured, outcome: 'already_confirmed' };
  }

  // Payment arrived after the hold expired: honour it if the rooms are still free.
  if (booking.status === 'expired' && booking.paymentStatus === 'unpaid') {
    const room = await Room.findById(booking.room);
    const stay = { roomId: booking.room, checkIn: booking.checkIn, checkOut: booking.checkOut, units: booking.rooms };
    if (room && (await reserveInventory({ ...stay, capacity: room.inventory }))) {
      const revived = await confirmedUpdate('expired');
      if (revived) {
        await onConfirmed(revived);
        return { booking: revived, payment: captured, outcome: 'confirmed' };
      }
      await releaseInventory(stay);
    }
  }

  // The booking can't be honoured (expired and sold out, or cancelled): refund in full.
  if (booking.paymentStatus === 'unpaid') {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'unpaid' },
      {
        $set: { paymentStatus: 'refund_pending' },
        $push: { statusHistory: { status: booking.status, note: `Late payment ${paymentId} received; refunding` } },
      },
    );
    await refundBookingPayment(booking._id, captured.amount);
  }
  throw ApiError.conflict(
    'Your payment arrived after this booking was released and the room is no longer available. A full refund has been initiated.',
    { code: 'BOOKING_NOT_HONOURED' },
  );
}

export async function verifyPayment(user, { bookingId, orderId, paymentId, signature }) {
  const payment = await Payment.findOne({ orderId, booking: bookingId, user: user._id });
  if (!payment) throw ApiError.notFound('Payment order not found');

  const gateway = gatewayFor(payment.provider);
  if (!gateway) throw ApiError.badRequest('This payment method is not available', { code: 'PAYMENTS_UNAVAILABLE' });

  if (!gateway.verifySignature({ orderId, paymentId, signature })) {
    await Payment.updateOne(
      { _id: payment._id, status: { $in: ['created', 'failed'] } },
      { $set: { status: 'failed', failureReason: 'Signature verification failed' }, $inc: { failedAttempts: 1 } },
    );
    throw ApiError.badRequest('Payment verification failed. You have not been charged for this booking.', {
      code: 'PAYMENT_VERIFICATION_FAILED',
    });
  }
  return confirmPayment(payment, paymentId, 'client');
}

export async function recordPaymentFailure(user, { bookingId, orderId, reason }) {
  await Payment.updateOne(
    { orderId, booking: bookingId, user: user._id, status: { $in: ['created', 'failed'] } },
    { $set: { status: 'failed', failureReason: reason }, $inc: { failedAttempts: 1 } },
  );
}

export async function refundBookingPayment(bookingId, amount) {
  const payment = await Payment.findOne({ booking: bookingId, status: 'captured' });
  const booking = await Booking.findById(bookingId);
  if (!payment || !booking) return;

  const fullRefund = amount >= payment.amount;
  const gateway = gatewayFor(payment.provider);
  try {
    if (!gateway) throw new Error(`gateway ${payment.provider} not configured`);
    const { refundId, processed } = await gateway.refund({ paymentId: payment.paymentId, amountMinor: toMinorUnits(amount) });
    payment.refund = { amount, refundId, status: processed ? 'processed' : 'pending', at: new Date() };
    payment.status = processed ? 'refunded' : 'refund_pending';
    await payment.save();
    if (processed) {
      booking.paymentStatus = fullRefund ? 'refunded' : 'partially_refunded';
      await booking.save();
    }
  } catch (err) {
    logger.error(`Refund for booking ${booking.reference} failed: ${err.message}`);
    payment.refund = { amount, status: 'failed', at: new Date() };
    payment.status = 'refund_pending';
    await payment.save();
    // booking.paymentStatus stays "refund_pending" so staff can follow up.
  }
}

export async function handleWebhookEvent(event) {
  const type = event?.event;
  const entity = event?.payload?.payment?.entity;

  if ((type === 'payment.captured' || type === 'order.paid') && entity?.order_id && entity?.id) {
    const payment = await Payment.findOne({ orderId: entity.order_id, provider: 'razorpay' });
    if (!payment) return { handled: false };
    try {
      await confirmPayment(payment, entity.id, 'webhook');
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      logger.warn(`Webhook ${type} for ${entity.order_id}: ${err.message}`);
    }
    return { handled: true };
  }

  if (type === 'payment.failed' && entity?.order_id) {
    await Payment.updateOne(
      { orderId: entity.order_id, status: { $in: ['created', 'failed'] } },
      {
        $set: { status: 'failed', failureReason: String(entity.error_description || 'Payment failed').slice(0, 300) },
        $inc: { failedAttempts: 1 },
      },
    );
    return { handled: true };
  }

  const refund = event?.payload?.refund?.entity;
  if (type === 'refund.processed' && refund?.payment_id) {
    const payment = await Payment.findOneAndUpdate(
      { paymentId: refund.payment_id },
      { $set: { status: 'refunded', 'refund.status': 'processed', 'refund.refundId': refund.id } },
      { new: true },
    );
    if (payment) {
      const booking = await Booking.findById(payment.booking);
      if (booking?.paymentStatus === 'refund_pending') {
        booking.paymentStatus = (payment.refund?.amount ?? payment.amount) >= payment.amount ? 'refunded' : 'partially_refunded';
        await booking.save();
      }
    }
    return { handled: true };
  }

  return { handled: false };
}
