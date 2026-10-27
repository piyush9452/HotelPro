import mongoose from 'mongoose';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired', 'no_show'];
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refund_pending', 'refunded', 'partially_refunded'];

const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: 'User', required: true },
    room: { type: ObjectId, ref: 'Room', required: true },
    roomSnapshot: {
      name: String,
      roomNumber: String,
      category: String,
      image: String,
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, required: true, min: 0, default: 0 },
    rooms: { type: Number, required: true, min: 1 },
    guest: {
      firstName: { type: String, required: true, trim: true, maxlength: 60 },
      lastName: { type: String, required: true, trim: true, maxlength: 60 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
      specialRequests: { type: String, trim: true, maxlength: 500, default: '' },
    },
    pricing: {
      nightlyRate: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      taxRate: { type: Number, required: true },
      taxes: { type: Number, required: true },
      serviceFeeRate: { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      total: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    // Pending bookings hold inventory until this time, then expire.
    expiresAt: { type: Date },
    // True while this booking's units are counted in RoomInventory.
    inventoryHeld: { type: Boolean, default: false },
    idempotencyKey: { type: String, maxlength: 100 },
    confirmedAt: Date,
    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: ObjectId, ref: 'User' },
      byRole: { type: String, enum: ['user', 'admin', 'system'] },
      reason: { type: String, maxlength: 500 },
      fee: Number,
      refundAmount: Number,
    },
    statusHistory: [
      {
        _id: false,
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ 'guest.email': 1 });
bookingSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export const Booking = mongoose.model('Booking', bookingSchema);
