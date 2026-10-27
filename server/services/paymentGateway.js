import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function hmacHex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

const RAZORPAY_API = 'https://api.razorpay.com/v1';

async function razorpayRequest(method, path, body) {
  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  let res;
  try {
    res = await fetch(`${RAZORPAY_API}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the payment gateway. Please try again.', { code: 'GATEWAY_UNAVAILABLE' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(502, data?.error?.description || 'The payment gateway rejected the request', { code: 'GATEWAY_ERROR' });
  }
  return data;
}

const razorpayGateway = {
  name: 'razorpay',
  isMock: false,
  publicConfig: () => ({ provider: 'razorpay', keyId: env.razorpay.keyId, isMock: false }),
  async createOrder({ amountMinor, currency, receipt, notes }) {
    const order = await razorpayRequest('POST', '/orders', { amount: amountMinor, currency, receipt, notes });
    return { orderId: order.id };
  },
  verifySignature({ orderId, paymentId, signature }) {
    return safeEqualHex(hmacHex(env.razorpay.keySecret, `${orderId}|${paymentId}`), signature);
  },
  async refund({ paymentId, amountMinor }) {
    const refund = await razorpayRequest('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountMinor });
    return { refundId: refund.id, processed: refund.status === 'processed' };
  },
};

// DEVELOPMENT ONLY. Simulates a hosted checkout so the full booking flow can be
// exercised without gateway credentials. No money moves. Disabled in production.
const mockGateway = {
  name: 'mock',
  isMock: true,
  publicConfig: () => ({ provider: 'mock', keyId: null, isMock: true }),
  async createOrder() {
    return { orderId: `mock_order_${crypto.randomBytes(8).toString('hex')}` };
  },
  verifySignature({ orderId, paymentId, signature }) {
    return safeEqualHex(hmacHex(env.mockPaymentSecret, `${orderId}|${paymentId}`), signature);
  },
  signPayment(orderId) {
    const paymentId = `mock_pay_${crypto.randomBytes(8).toString('hex')}`;
    return { paymentId, signature: hmacHex(env.mockPaymentSecret, `${orderId}|${paymentId}`) };
  },
  async refund() {
    return { refundId: `mock_rfnd_${crypto.randomBytes(8).toString('hex')}`, processed: true };
  },
};

export function activeGateway() {
  if (env.razorpay.enabled) return razorpayGateway;
  if (env.mockPaymentsEnabled) return mockGateway;
  return null;
}

export function gatewayFor(providerName) {
  if (providerName === 'razorpay' && env.razorpay.enabled) return razorpayGateway;
  if (providerName === 'mock' && env.mockPaymentsEnabled) return mockGateway;
  return null;
}

export function verifyRazorpayWebhook(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;
  return safeEqualHex(hmacHex(env.razorpay.webhookSecret, rawBody), signature);
}

export { mockGateway };
