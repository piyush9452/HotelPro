import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { RoomInventory } from '../models/RoomInventory.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, formatDateOnly, nightsBetween, parseDateOnly, todayInTimezone } from '../utils/dates.js';
import { asyncHandler, escapeRegex, paginationMeta, sendSuccess } from '../utils/http.js';
import { toCsv } from '../utils/csv.js';
import { round2 } from '../utils/pricing.js';
import { cancelBooking } from '../services/bookingService.js';
import { recordAudit } from '../services/auditService.js';
import { ADMIN_STATUS_TRANSITIONS } from '../validators/booking.js';

const tz = () => env.hotel.timezone;
const dayKey = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: tz() } });

// Revenue counts only gateway-verified payments, net of processed refunds.
async function revenueTotals(match = {}) {
  const [row] = await Payment.aggregate([
    { $match: { verifiedAt: { $exists: true }, ...match } },
    {
      $group: {
        _id: null,
        gross: { $sum: '$amount' },
        refunds: { $sum: { $cond: [{ $eq: ['$refund.status', 'processed'] }, '$refund.amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  const gross = round2(row?.gross || 0);
  const refunds = round2(row?.refunds || 0);
  return { gross, refunds, net: round2(gross - refunds), count: row?.count || 0 };
}

async function totalActiveUnits() {
  const [row] = await Room.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, units: { $sum: '$inventory' } } }]);
  return row?.units || 0;
}

async function heldUnitsByDay(from, to) {
  const activeIds = await Room.find({ isActive: true }).distinct('_id');
  const rows = await RoomInventory.aggregate([
    { $match: { room: { $in: activeIds }, date: { $gte: from, $lt: to } } },
    { $group: { _id: '$date', held: { $sum: '$booked' } } },
  ]);
  return new Map(rows.map((r) => [formatDateOnly(r._id), r.held]));
}

export const dashboard = asyncHandler(async (_req, res) => {
  const today = todayInTimezone(tz());
  const since = addDays(today, -29);

  const [statusCounts, roomStats, categories, totalUnits, occupiedRow, revenue, paymentSummary, bookingTrend, revenueTrend, recentBookings, userCount, held] =
    await Promise.all([
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Room.aggregate([{ $group: { _id: '$isActive', count: { $sum: 1 } } }]),
      Room.distinct('category', { isActive: true }),
      totalActiveUnits(),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lte: today }, checkOut: { $gt: today } } },
        { $group: { _id: null, units: { $sum: '$rooms' } } },
      ]),
      revenueTotals(),
      Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayKey('$createdAt'), bookings: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { verifiedAt: { $gte: since } } },
        { $group: { _id: dayKey('$verifiedAt'), revenue: { $sum: '$amount' } } },
      ]),
      Booking.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').select('-statusHistory -idempotencyKey'),
      User.countDocuments({ role: 'user' }),
      heldUnitsByDay(today, addDays(today, 7)),
    ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const bookingsByDay = new Map(bookingTrend.map((r) => [r._id, r.bookings]));
  const revenueByDay = new Map(revenueTrend.map((r) => [r._id, r.revenue]));
  const trend = Array.from({ length: 30 }, (_, i) => {
    const key = formatDateOnly(addDays(since, i));
    return { date: key, bookings: bookingsByDay.get(key) || 0, revenue: round2(revenueByDay.get(key) || 0) };
  });
  const occupancyForecast = Array.from({ length: 7 }, (_, i) => {
    const key = formatDateOnly(addDays(today, i));
    const h = held.get(key) || 0;
    return { date: key, held: h, available: Math.max(0, totalUnits - h), rate: totalUnits ? round2((h / totalUnits) * 100) : 0 };
  });

  const occupied = occupiedRow[0]?.units || 0;
  const heldTonight = held.get(formatDateOnly(today)) || 0;
  const activeRooms = roomStats.find((r) => r._id === true)?.count || 0;
  const inactiveRooms = roomStats.find((r) => r._id === false)?.count || 0;

  sendSuccess(res, {
    data: {
      kpis: {
        totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
        pendingBookings: byStatus.pending || 0,
        confirmedBookings: byStatus.confirmed || 0,
        checkedIn: byStatus.checked_in || 0,
        cancelledBookings: byStatus.cancelled || 0,
        expiredBookings: byStatus.expired || 0,
        completedBookings: byStatus.checked_out || 0,
        totalRoomTypes: activeRooms + inactiveRooms,
        activeRoomTypes: activeRooms,
        inactiveRoomTypes: inactiveRooms,
        categories: categories.length,
        totalUnits,
        occupiedTonight: occupied,
        availableTonight: Math.max(0, totalUnits - heldTonight),
        occupancyRate: totalUnits ? round2((occupied / totalUnits) * 100) : 0,
        registeredGuests: userCount,
      },
      revenue: { ...revenue, currency: env.hotel.currency },
      paymentSummary: paymentSummary.map((p) => ({ status: p._id, count: p.count, amount: round2(p.amount) })),
      bookingsByStatus: byStatus,
      trend,
      occupancyForecast,
      recentBookings,
    },
  });
});

function reportRange(query, { defaultBackDays = 29, defaultForwardDays = 0 } = {}) {
  const today = todayInTimezone(tz());
  const from = query.from ? parseDateOnly(query.from) : addDays(today, -defaultBackDays);
  const toInclusive = query.to ? parseDateOnly(query.to) : addDays(today, defaultForwardDays);
  if (!from || !toInclusive) throw ApiError.badRequest('Invalid report dates');
  if (toInclusive < from) throw ApiError.badRequest('"To" date must be on or after "from" date');
  if (nightsBetween(from, toInclusive) > 366) throw ApiError.badRequest('Reports are limited to a 366-day range');
  return { from, to: addDays(toInclusive, 1), label: { from: formatDateOnly(from), to: formatDateOnly(toInclusive) } };
}

// Day boundaries follow the hotel timezone; widen the UTC window by a day each side and filter by local day key.
const localDayMatch = (field, { from, to }) => [
  { $match: { [field]: { $gte: addDays(from, -1), $lt: addDays(to, 1) } } },
  { $addFields: { _day: dayKey(`$${field}`) } },
  { $match: { _day: { $gte: formatDateOnly(from), $lt: formatDateOnly(to) } } },
];

const REPORTS = {
  async revenue(range) {
    const [captured, refunded] = await Promise.all([
      Payment.aggregate([
        ...localDayMatch('verifiedAt', range),
        { $group: { _id: '$_day', gross: { $sum: '$amount' }, payments: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { 'refund.status': 'processed' } },
        ...localDayMatch('refund.at', range),
        { $group: { _id: '$_day', refunds: { $sum: '$refund.amount' } } },
      ]),
    ]);
    const refundsByDay = new Map(refunded.map((r) => [r._id, r.refunds]));
    const capturedByDay = new Map(captured.map((r) => [r._id, r]));
    const rows = [];
    for (let d = range.from; d < range.to; d = addDays(d, 1)) {
      const key = formatDateOnly(d);
      const gross = round2(capturedByDay.get(key)?.gross || 0);
      const refunds = round2(refundsByDay.get(key) || 0);
      rows.push({ date: key, payments: capturedByDay.get(key)?.payments || 0, gross, refunds, net: round2(gross - refunds) });
    }
    const summary = rows.reduce(
      (acc, r) => ({ payments: acc.payments + r.payments, gross: round2(acc.gross + r.gross), refunds: round2(acc.refunds + r.refunds), net: round2(acc.net + r.net) }),
      { payments: 0, gross: 0, refunds: 0, net: 0 },
    );
    return {
      rows,
      summary: { ...summary, currency: env.hotel.currency },
      columns: [
        { label: 'Date', value: 'date' },
        { label: 'Verified payments', value: 'payments' },
        { label: 'Gross', value: 'gross' },
        { label: 'Refunds', value: 'refunds' },
        { label: 'Net', value: 'net' },
      ],
    };
  },

  async bookings(range) {
    const bookings = await Booking.aggregate([
      ...localDayMatch('createdAt', range),
      { $sort: { createdAt: -1 } },
      { $limit: 5000 },
      { $project: { statusHistory: 0, idempotencyKey: 0 } },
    ]);
    const byStatus = {};
    let value = 0;
    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (['confirmed', 'checked_in', 'checked_out'].includes(b.status)) value += b.pricing.total;
    }
    const rows = bookings.map((b) => ({
      reference: b.reference,
      guest: `${b.guest.firstName} ${b.guest.lastName}`,
      email: b.guest.email,
      room: b.roomSnapshot?.name,
      checkIn: formatDateOnly(b.checkIn),
      checkOut: formatDateOnly(b.checkOut),
      nights: b.nights,
      rooms: b.rooms,
      guests: b.adults + b.children,
      status: b.status,
      paymentStatus: b.paymentStatus,
      total: b.pricing.total,
      createdAt: b.createdAt,
    }));
    return {
      rows,
      summary: { total: rows.length, byStatus, confirmedValue: round2(value), currency: env.hotel.currency },
      columns: [
        { label: 'Reference', value: 'reference' },
        { label: 'Guest', value: 'guest' },
        { label: 'Email', value: 'email' },
        { label: 'Room', value: 'room' },
        { label: 'Check-in', value: 'checkIn' },
        { label: 'Check-out', value: 'checkOut' },
        { label: 'Nights', value: 'nights' },
        { label: 'Rooms', value: 'rooms' },
        { label: 'Guests', value: 'guests' },
        { label: 'Status', value: 'status' },
        { label: 'Payment', value: 'paymentStatus' },
        { label: 'Total', value: 'total' },
        { label: 'Created', value: 'createdAt' },
      ],
    };
  },

  async occupancy(range) {
    const totalUnits = await totalActiveUnits();
    const confirmed = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] }, checkIn: { $lt: range.to }, checkOut: { $gt: range.from } } },
      { $project: { checkIn: 1, checkOut: 1, rooms: 1 } },
    ]);
    const held = await heldUnitsByDay(range.from, range.to);
    const rows = [];
    for (let d = range.from; d < range.to; d = addDays(d, 1)) {
      const occupied = confirmed.reduce((sum, b) => (b.checkIn <= d && b.checkOut > d ? sum + b.rooms : sum), 0);
      rows.push({
        date: formatDateOnly(d),
        totalUnits,
        occupied,
        heldIncludingPending: held.get(formatDateOnly(d)) || 0,
        occupancyRate: totalUnits ? round2((occupied / totalUnits) * 100) : 0,
      });
    }
    const avg = rows.length ? round2(rows.reduce((s, r) => s + r.occupancyRate, 0) / rows.length) : 0;
    return {
      rows,
      summary: { averageOccupancyRate: avg, totalUnits, roomNights: rows.reduce((s, r) => s + r.occupied, 0) },
      columns: [
        { label: 'Date', value: 'date' },
        { label: 'Total units', value: 'totalUnits' },
        { label: 'Occupied (confirmed)', value: 'occupied' },
        { label: 'Held incl. pending', value: 'heldIncludingPending' },
        { label: 'Occupancy %', value: 'occupancyRate' },
      ],
    };
  },

  async cancellations(range) {
    const cancelled = await Booking.aggregate([
      { $match: { status: 'cancelled' } },
      ...localDayMatch('cancellation.cancelledAt', range),
      { $sort: { 'cancellation.cancelledAt': -1 } },
      { $limit: 5000 },
    ]);
    const rows = cancelled.map((b) => ({
      reference: b.reference,
      guest: `${b.guest.firstName} ${b.guest.lastName}`,
      room: b.roomSnapshot?.name,
      checkIn: formatDateOnly(b.checkIn),
      cancelledAt: b.cancellation?.cancelledAt,
      cancelledBy: b.cancellation?.byRole,
      reason: b.cancellation?.reason || '',
      total: b.pricing.total,
      fee: b.cancellation?.fee || 0,
      refund: b.cancellation?.refundAmount || 0,
      paymentStatus: b.paymentStatus,
    }));
    const expired = await Booking.countDocuments({ status: 'expired', updatedAt: { $gte: range.from, $lt: range.to } });
    const created = await Booking.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } });
    return {
      rows,
      summary: {
        cancelled: rows.length,
        byGuest: rows.filter((r) => r.cancelledBy === 'user').length,
        byHotel: rows.filter((r) => r.cancelledBy === 'admin').length,
        expiredUnpaid: expired,
        cancellationRate: created ? round2((rows.length / created) * 100) : 0,
        feesRetained: round2(rows.reduce((s, r) => s + r.fee, 0)),
        refunds: round2(rows.reduce((s, r) => s + r.refund, 0)),
        currency: env.hotel.currency,
      },
      columns: [
        { label: 'Reference', value: 'reference' },
        { label: 'Guest', value: 'guest' },
        { label: 'Room', value: 'room' },
        { label: 'Check-in', value: 'checkIn' },
        { label: 'Cancelled at', value: 'cancelledAt' },
        { label: 'Cancelled by', value: 'cancelledBy' },
        { label: 'Reason', value: 'reason' },
        { label: 'Total', value: 'total' },
        { label: 'Fee', value: 'fee' },
        { label: 'Refund', value: 'refund' },
        { label: 'Payment status', value: 'paymentStatus' },
      ],
    };
  },
};

export const reports = asyncHandler(async (req, res) => {
  const { type, format } = req.query;
  const range = reportRange(req.query, type === 'occupancy' ? { defaultBackDays: 0, defaultForwardDays: 29 } : undefined);
  const report = await REPORTS[type](range);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hotelpro-${type}-${range.label.from}-to-${range.label.to}.csv"`);
    return res.send(toCsv(report.rows, report.columns));
  }
  return sendSuccess(res, { data: { type, range: range.label, summary: report.summary, rows: report.rows } });
});

// ----- Users -----

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, q, role, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.isActive = status === 'active';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const counts = await Booking.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$user', bookings: { $sum: 1 } } },
  ]);
  const countByUser = new Map(counts.map((c) => [c._id.toString(), c.bookings]));
  const data = users.map(({ password, passwordChangedAt, __v, ...u }) => ({ ...u, bookingCount: countByUser.get(u._id.toString()) || 0 }));
  sendSuccess(res, { data, meta: paginationMeta(page, limit, total) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const [bookings, stats] = await Promise.all([
    Booking.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).select('-statusHistory -idempotencyKey'),
    Booking.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          spent: { $sum: { $cond: [{ $in: ['$paymentStatus', ['paid', 'partially_refunded']] }, '$pricing.total', 0] } },
        },
      },
    ]),
  ]);
  sendSuccess(res, { data: { user, bookings, stats: { total: stats[0]?.total || 0, spent: round2(stats[0]?.spent || 0) } } });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw ApiError.badRequest('You cannot change the status of your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin' && !req.body.isActive) throw ApiError.forbidden('Administrator accounts cannot be deactivated here');

  user.isActive = req.body.isActive;
  await user.save();
  await recordAudit(req, {
    action: user.isActive ? 'user.activate' : 'user.deactivate',
    entityType: 'User',
    entityId: user._id,
    details: { email: user.email, reason: req.body.reason },
  });
  sendSuccess(res, { data: user, message: user.isActive ? 'Account activated' : 'Account deactivated' });
});

// ----- Bookings -----

export const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, q, status, paymentStatus, from, to, dateField, room, user } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (room) filter.room = new mongoose.Types.ObjectId(room);
  if (user) filter.user = new mongoose.Types.ObjectId(user);
  if (from || to) {
    filter[dateField] = {};
    if (from) filter[dateField].$gte = parseDateOnly(from);
    if (to) filter[dateField].$lt = addDays(parseDateOnly(to), 1);
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ reference: rx }, { 'guest.email': rx }, { 'guest.firstName': rx }, { 'guest.lastName': rx }, { 'guest.phone': rx }];
  }
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .select('-statusHistory -idempotencyKey'),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, { data: bookings, meta: paginationMeta(page, limit, total) });
});

export const getBookingAdmin = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'name email phone isActive')
    .populate('room', 'name roomNumber category isActive')
    .populate('statusHistory.by', 'name role')
    .populate('cancellation.cancelledBy', 'name role');
  if (!booking) throw ApiError.notFound('Booking not found');
  const [payments, auditTrail] = await Promise.all([
    Payment.find({ booking: booking._id }).sort({ createdAt: -1 }),
    AuditLog.find({ entityType: 'Booking', entityId: booking._id }).sort({ createdAt: -1 }).populate('actor', 'name'),
  ]);
  sendSuccess(res, { data: { booking, payments, auditTrail } });
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  const { status, note } = req.body;

  if (status === 'cancelled') {
    const updated = await cancelBooking(booking, req.user, { reason: note || 'Cancelled by hotel', byRole: 'admin' });
    await recordAudit(req, {
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: booking._id,
      details: { reference: booking.reference, from: booking.status, note, refundAmount: updated.cancellation?.refundAmount },
    });
    return sendSuccess(res, { data: updated, message: 'Booking cancelled and guest refunded where applicable' });
  }

  const allowed = ADMIN_STATUS_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(`Cannot change a ${booking.status.replace('_', ' ')} booking to ${status.replace('_', ' ')}`, { code: 'INVALID_TRANSITION' });
  }
  const today = todayInTimezone(tz());
  if ((status === 'checked_in' || status === 'no_show') && today < booking.checkIn) {
    throw ApiError.conflict('Guests cannot be checked in (or marked no-show) before the check-in date', { code: 'INVALID_TRANSITION' });
  }
  if (status === 'checked_in' && today >= booking.checkOut) {
    throw ApiError.conflict('This stay has already ended', { code: 'INVALID_TRANSITION' });
  }

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    { $set: { status }, $push: { statusHistory: { status, by: req.user._id, note } } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('This booking was changed by someone else. Please refresh.');
  await recordAudit(req, {
    action: 'booking.status',
    entityType: 'Booking',
    entityId: booking._id,
    details: { reference: booking.reference, from: booking.status, to: status, note },
  });
  return sendSuccess(res, { data: updated, message: `Booking marked as ${status.replace('_', ' ')}` });
});

export const auditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, entityType, entityId } = req.query;
  const filter = {};
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`);
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'name email'),
    AuditLog.countDocuments(filter),
  ]);
  sendSuccess(res, { data: logs, meta: paginationMeta(page, limit, total) });
});
