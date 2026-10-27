import mongoose from 'mongoose';

export const PAYMENT_RECORD_STATUSES = ['created', 'captured', 'failed', 'refund_pending', 'refunded'];

const { ObjectId } = mongoose.Schema.Types;

// One record per gateway order. Card data never touches this server.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['razorpay', 'mock'], required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: PAYMENT_RECORD_STATUSES, default: 'created', index: true },
    failureReason: { type: String, maxlength: 300 },
    failedAttempts: { type: Number, default: 0 },
    verifiedAt: Date,
    verifiedVia: { type: String, enum: ['client', 'webhook'] },
    refund: {
      amount: Number,
      refundId: String,
      status: { type: String, enum: ['pending', 'processed', 'failed'] },
      at: Date,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

paymentSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: 'string' } } });
paymentSchema.index({ status: 1, verifiedAt: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
