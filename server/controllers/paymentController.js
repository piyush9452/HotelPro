import { env } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import { activeGateway, mockGateway, verifyRazorpayWebhook } from '../services/paymentGateway.js';
import { createOrder, handleWebhookEvent, recordPaymentFailure, verifyPayment } from '../services/paymentService.js';
import { logger } from '../utils/logger.js';

export const paymentConfig = (_req, res) => {
  const gateway = activeGateway();
  sendSuccess(res, { data: gateway ? { enabled: true, ...gateway.publicConfig() } : { enabled: false } });
};

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await createOrder(req.user, req.body.bookingId);
  sendSuccess(res, { status: 201, data: order });
});

export const verify = asyncHandler(async (req, res) => {
  const { booking, outcome } = await verifyPayment(req.user, req.body);
  sendSuccess(res, {
    data: { booking, outcome },
    message: outcome === 'already_confirmed' ? 'Payment already confirmed' : 'Payment verified. Your booking is confirmed!',
  });
});

export const reportFailure = asyncHandler(async (req, res) => {
  await recordPaymentFailure(req.user, req.body);
  sendSuccess(res, { message: 'Payment was not completed. You can retry before your hold expires.' });
});

// DEVELOPMENT ONLY: plays the role of the gateway's hosted checkout and returns
// a signed result that must still pass /payments/verify. No money moves.
export const mockCheckout = asyncHandler(async (req, res) => {
  if (!env.mockPaymentsEnabled) throw ApiError.notFound('Mock payments are disabled');
  const payment = await Payment.findOne({ orderId: req.body.orderId, user: req.user._id, provider: 'mock' });
  if (!payment) throw ApiError.notFound('Payment order not found');

  if (req.body.outcome === 'failure') {
    return sendSuccess(res, { data: { status: 'failed', reason: 'Simulated card decline (development mock)' } });
  }
  return sendSuccess(res, { data: { status: 'success', orderId: payment.orderId, ...mockGateway.signPayment(payment.orderId) } });
});

// Mounted with express.raw so the signature is computed over the exact bytes received.
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!signature || !verifyRazorpayWebhook(raw, signature)) {
    throw ApiError.badRequest('Invalid webhook signature', { code: 'INVALID_SIGNATURE' });
  }
  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    throw ApiError.badRequest('Malformed webhook payload');
  }
  const result = await handleWebhookEvent(event);
  if (!result.handled) logger.info(`Ignored webhook event: ${event?.event}`);
  sendSuccess(res, { data: { received: true } });
});
