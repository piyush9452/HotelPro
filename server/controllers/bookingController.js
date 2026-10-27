import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { todayInTimezone } from '../utils/dates.js';
import { asyncHandler, paginationMeta, sendSuccess } from '../utils/http.js';
import { ACTIVE_STATUSES, cancelBooking, cancellationTerms, createBooking } from '../services/bookingService.js';
import { recordAudit } from '../services/auditService.js';

const PAYMENT_FIELDS = 'provider orderId paymentId amount currency status failureReason verifiedAt refund createdAt';

// Non-owners get 404 rather than 403 so booking ids can't be probed.
export async function loadAccessibleBooking(req) {
  const booking = await Booking.findById(req.params.id).populate('room', 'name category images pricePerNight isActive');
  if (!booking) throw ApiError.notFound('Booking not found');
  const isOwner = booking.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw ApiError.notFound('Booking not found');
  return { booking, isOwner };
}

export const create = asyncHandler(async (req, res) => {
  const { booking, created } = await createBooking(req.user, req.body);
  sendSuccess(res, {
    status: created ? 201 : 200,
    data: booking,
    message: created
      ? `Your rooms are held for ${env.hotel.pendingBookingTtlMinutes} minutes. Complete payment to confirm.`
      : 'This booking was already submitted',
  });
});

export const myBookings = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const today = todayInTimezone(env.hotel.timezone);
  const filter = { user: req.user._id };
  if (status === 'upcoming') Object.assign(filter, { status: { $in: [...ACTIVE_STATUSES, 'checked_in'] }, checkOut: { $gte: today } });
  else if (status === 'past') filter.$or = [{ status: { $in: ['checked_out', 'no_show'] } }, { status: 'confirmed', checkOut: { $lt: today } }];
  else if (status === 'cancelled') filter.status = { $in: ['cancelled', 'expired'] };
  else if (status) filter.status = status;

  const sort = status === 'upcoming' ? { checkIn: 1 } : { createdAt: -1 };
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).select('-statusHistory -idempotencyKey'),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, { data: bookings, meta: paginationMeta(page, limit, total) });
});

export const getBooking = asyncHandler(async (req, res) => {
  const { booking, isOwner } = await loadAccessibleBooking(req);
  const payments = await Payment.find({ booking: booking._id }).select(PAYMENT_FIELDS).sort({ createdAt: -1 });
  const byRole = isOwner ? 'user' : 'admin';
  const cancellation = ACTIVE_STATUSES.includes(booking.status) ? cancellationTerms(booking, { byRole }) : null;
  const data = booking.toJSON();
  delete data.idempotencyKey;
  sendSuccess(res, { data: { ...data, payments, cancellationPreview: cancellation } });
});

export const cancel = asyncHandler(async (req, res) => {
  const { booking, isOwner } = await loadAccessibleBooking(req);
  const byRole = isOwner ? 'user' : 'admin';
  const updated = await cancelBooking(booking, req.user, { reason: req.body.reason, byRole });
  if (byRole === 'admin') {
    await recordAudit(req, {
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: booking._id,
      details: { reference: booking.reference, reason: req.body.reason, refundAmount: updated.cancellation?.refundAmount },
    });
  }
  const refund = updated.cancellation?.refundAmount;
  sendSuccess(res, {
    data: updated,
    message: refund ? `Booking cancelled. A refund of ${updated.pricing.currency} ${refund.toFixed(2)} has been initiated.` : 'Booking cancelled',
  });
});
