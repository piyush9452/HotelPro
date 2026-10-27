import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Room } from '../models/Room.js';
import { ApiError } from '../utils/ApiError.js';
import { checkInInstant } from '../utils/dates.js';
import { calculatePrice, round2 } from '../utils/pricing.js';
import { logger } from '../utils/logger.js';
import { releaseInventory, reserveInventory } from './inventoryService.js';
import { assertCapacity, parseStayDates } from './stayService.js';
import { sendBookingCancelledEmail } from './emailService.js';
import { refundBookingPayment } from './paymentService.js';

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReference(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  let suffix = '';
  for (let i = 0; i < 6; i += 1) suffix += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `HP${ymd}-${suffix}`;
}

export const ACTIVE_STATUSES = ['pending', 'confirmed'];

const isDuplicate = (err, field) => err?.code === 11000 && Object.keys(err.keyPattern || {}).includes(field);

export async function quoteStay(room, { checkIn, checkOut, adults, children, rooms }) {
  const stay = parseStayDates(checkIn, checkOut);
  assertCapacity(room, { adults, children, rooms });
  return { ...stay, pricing: calculatePrice({ nightlyRate: room.pricePerNight, nights: stay.nights, rooms }) };
}

/**
 * Creates a pending booking that holds inventory until it is paid or expires.
 * Prices come only from the room record. Repeating a request with the same
 * idempotency key returns the original booking instead of a second one.
 */
export async function createBooking(user, input) {
  if (input.idempotencyKey) {
    const existing = await Booking.findOne({ user: user._id, idempotencyKey: input.idempotencyKey });
    if (existing) return { booking: existing, created: false };
  }

  const room = await Room.findOne({ _id: input.roomId, isActive: true });
  if (!room) throw ApiError.notFound('This room is not available for booking');

  const { checkIn, checkOut, nights, pricing } = await quoteStay(room, input);

  const reserved = await reserveInventory({
    roomId: room._id,
    capacity: room.inventory,
    checkIn,
    checkOut,
    units: input.rooms,
  });
  if (!reserved) {
    throw ApiError.conflict('Sorry, there are not enough rooms of this type left for your dates', { code: 'NOT_AVAILABLE' });
  }

  const now = new Date();
  const doc = {
    user: user._id,
    room: room._id,
    roomSnapshot: {
      name: room.name,
      roomNumber: room.roomNumber,
      category: room.category,
      image: room.images[0]?.url,
    },
    checkIn,
    checkOut,
    nights,
    adults: input.adults,
    children: input.children ?? 0,
    rooms: input.rooms,
    guest: input.guest,
    pricing: {
      nightlyRate: pricing.nightlyRate,
      subtotal: pricing.subtotal,
      taxRate: pricing.taxRate,
      taxes: pricing.taxes,
      serviceFeeRate: pricing.serviceFeeRate,
      serviceFee: pricing.serviceFee,
      total: pricing.total,
      currency: pricing.currency,
    },
    status: 'pending',
    paymentStatus: 'unpaid',
    inventoryHeld: true,
    expiresAt: new Date(now.getTime() + env.hotel.pendingBookingTtlMinutes * 60 * 1000),
    idempotencyKey: input.idempotencyKey,
    statusHistory: [{ status: 'pending', by: user._id, note: 'Booking created, awaiting payment' }],
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const booking = await Booking.create({ ...doc, reference: generateReference(now) });
      return { booking, created: true };
    } catch (err) {
      if (isDuplicate(err, 'reference')) continue;
      await releaseInventory({ roomId: room._id, checkIn, checkOut, units: input.rooms });
      if (isDuplicate(err, 'idempotencyKey')) {
        // A concurrent identical submission won the race; return its booking.
        const existing = await Booking.findOne({ user: user._id, idempotencyKey: input.idempotencyKey });
        if (existing) return { booking: existing, created: false };
      }
      throw err;
    }
  }
  await releaseInventory({ roomId: room._id, checkIn, checkOut, units: input.rooms });
  throw new ApiError(500, 'Could not generate a booking reference. Please try again.');
}

/**
 * Cancellation policy:
 *  - Unpaid (pending) bookings can be cancelled at no charge.
 *  - Paid bookings cancelled at least FREE_CANCELLATION_HOURS before check-in get a full refund.
 *  - Later cancellations are charged one night (its share of taxes and fees included).
 *  - Guests cannot cancel once the check-in time has passed.
 *  - Hotel-initiated (admin) cancellations are always fully refunded.
 */
export function cancellationTerms(booking, { byRole, now = new Date() }) {
  const checkInAt = checkInInstant(booking.checkIn, env.hotel.timezone, env.hotel.checkInHour);
  const hoursUntilCheckIn = (checkInAt.getTime() - now.getTime()) / 3_600_000;
  const paid = booking.paymentStatus === 'paid';
  const total = booking.pricing.total;

  if (byRole === 'user' && hoursUntilCheckIn <= 0) {
    return { allowed: false, reason: 'This booking can no longer be cancelled online because check-in time has passed' };
  }
  if (!paid) return { allowed: true, fee: 0, refundAmount: 0, hoursUntilCheckIn };

  const free = byRole === 'admin' || hoursUntilCheckIn >= env.hotel.freeCancellationHours;
  const fee = free ? 0 : round2(total / booking.nights);
  return { allowed: true, fee, refundAmount: round2(total - fee), hoursUntilCheckIn };
}

export async function cancelBooking(booking, actor, { reason = '', byRole }) {
  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw ApiError.conflict(`A ${booking.status.replace('_', ' ')} booking cannot be cancelled`, { code: 'INVALID_STATUS' });
  }
  const terms = cancellationTerms(booking, { byRole });
  if (!terms.allowed) throw ApiError.conflict(terms.reason, { code: 'CANCELLATION_NOT_ALLOWED' });

  const nextPaymentStatus = terms.refundAmount > 0 ? 'refund_pending' : booking.paymentStatus;
  const before = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $in: ACTIVE_STATUSES }, paymentStatus: booking.paymentStatus },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: nextPaymentStatus,
        inventoryHeld: false,
        cancellation: {
          cancelledAt: new Date(),
          cancelledBy: actor._id,
          byRole,
          reason,
          fee: terms.fee,
          refundAmount: terms.refundAmount,
        },
      },
      $unset: { expiresAt: 1 },
      $push: { statusHistory: { status: 'cancelled', by: actor._id, note: reason || `Cancelled by ${byRole}` } },
    },
    { returnDocument: 'before' },
  );
  if (!before) throw ApiError.conflict('This booking changed while you were cancelling it. Please refresh and try again.');

  if (before.inventoryHeld) {
    await releaseInventory({ roomId: before.room, checkIn: before.checkIn, checkOut: before.checkOut, units: before.rooms });
  }

  if (terms.refundAmount > 0) await refundBookingPayment(before._id, terms.refundAmount);

  const updated = await Booking.findById(before._id);
  sendBookingCancelledEmail(updated).catch(() => {});
  return updated;
}

/**
 * Pending bookings hold inventory for PENDING_BOOKING_TTL_MINUTES. After that
 * they become "expired" and their rooms return to the pool. A payment that
 * arrives later is honoured only if the rooms are still free; otherwise it is
 * refunded (see paymentService.confirmPayment).
 */
export async function expireStalePendingBookings(now = new Date(), maxBatch = 500) {
  let expired = 0;
  while (expired < maxBatch) {
    const before = await Booking.findOneAndUpdate(
      { status: 'pending', expiresAt: { $lte: now } },
      {
        $set: { status: 'expired', inventoryHeld: false },
        $push: { statusHistory: { status: 'expired', note: 'Payment was not completed in time' } },
      },
      { returnDocument: 'before' },
    );
    if (!before) break;
    if (before.inventoryHeld) {
      await releaseInventory({ roomId: before.room, checkIn: before.checkIn, checkOut: before.checkOut, units: before.rooms });
    }
    expired += 1;
  }
  if (expired) logger.info(`Expired ${expired} unpaid booking(s) and released their rooms`);
  return expired;
}

export function startExpirySweeper(intervalMs = 60_000) {
  const timer = setInterval(() => {
    expireStalePendingBookings().catch((err) => logger.error(`Expiry sweep failed: ${err.message}`));
  }, intervalMs);
  timer.unref();
  return timer;
}
