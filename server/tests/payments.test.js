import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bookingPayload, createRoom, loggedInClient, newClient, useTestDatabase } from './helpers/setup.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Room } from '../models/Room.js';
import { env } from '../config/env.js';
import { expireStalePendingBookings } from '../services/bookingService.js';

useTestDatabase();

async function pendingBookingWithOrder(roomOverrides) {
  const room = await createRoom(roomOverrides);
  const { client, user } = await loggedInClient();
  const booking = (await client.post('/api/bookings').send(bookingPayload(room)).expect(201)).body.data;
  const order = (await client.post('/api/payments/create-order').send({ bookingId: booking._id }).expect(201)).body.data;
  return { room, client, user, booking, order };
}

async function mockPay(client, orderId) {
  return (await client.post('/api/payments/mock/checkout').send({ orderId, outcome: 'success' })).body.data;
}

describe('payment orders', () => {
  it('creates an order for the server-calculated amount and reuses it on retry', async () => {
    const { client, booking, order } = await pendingBookingWithOrder();
    assert.equal(order.isMock, true);
    assert.equal(order.amount, booking.pricing.total);
    assert.equal(order.amountMinor, Math.round(booking.pricing.total * 100));
    const again = await client.post('/api/payments/create-order').send({ bookingId: booking._id });
    assert.equal(again.body.data.orderId, order.orderId);
    assert.equal(await Payment.countDocuments(), 1);
  });

  it('refuses orders for other users’ bookings', async () => {
    const { booking } = await pendingBookingWithOrder();
    const { client: other } = await loggedInClient();
    assert.equal((await other.post('/api/payments/create-order').send({ bookingId: booking._id })).status, 404);
  });

  it('refuses orders once the hold has expired', async () => {
    const { client, booking } = await pendingBookingWithOrder();
    await Booking.updateOne({ _id: booking._id }, { expiresAt: new Date(Date.now() - 1000) });
    const res = await client.post('/api/payments/create-order').send({ bookingId: booking._id });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'BOOKING_EXPIRED');
  });
});

describe('payment verification', () => {
  it('confirms the booking only after the signature verifies', async () => {
    const { client, booking, order } = await pendingBookingWithOrder();
    const paid = await mockPay(client, order.orderId);

    const forged = await client.post('/api/payments/verify').send({
      bookingId: booking._id,
      orderId: order.orderId,
      paymentId: paid.paymentId,
      signature: crypto.randomBytes(32).toString('hex'),
    });
    assert.equal(forged.status, 400);
    assert.equal(forged.body.error.code, 'PAYMENT_VERIFICATION_FAILED');
    let stored = await Booking.findById(booking._id);
    assert.equal(stored.status, 'pending');
    assert.equal(stored.paymentStatus, 'unpaid');

    const ok = await client.post('/api/payments/verify').send({ bookingId: booking._id, orderId: order.orderId, ...paid });
    assert.equal(ok.status, 200);
    stored = await Booking.findById(booking._id);
    assert.equal(stored.status, 'confirmed');
    assert.equal(stored.paymentStatus, 'paid');
    const payment = await Payment.findOne({ orderId: order.orderId });
    assert.equal(payment.status, 'captured');
    assert.equal(payment.paymentId, paid.paymentId);
  });

  it('is idempotent for duplicate callbacks', async () => {
    const { room, client, booking, order } = await pendingBookingWithOrder();
    const paid = await mockPay(client, order.orderId);
    const body = { bookingId: booking._id, orderId: order.orderId, ...paid };
    const results = await Promise.all([1, 2, 3].map(() => client.post('/api/payments/verify').send(body)));
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
    assert.equal(results.filter((r) => r.body.data.outcome === 'confirmed').length, 1);
    assert.equal((await Room.findById(room._id)).popularity, 1, 'side effects ran once');
  });

  it('does not let another user verify a payment', async () => {
    const { client, booking, order } = await pendingBookingWithOrder();
    const paid = await mockPay(client, order.orderId);
    const { client: other } = await loggedInClient();
    const res = await other.post('/api/payments/verify').send({ bookingId: booking._id, orderId: order.orderId, ...paid });
    assert.equal(res.status, 404);
  });

  it('records failed or cancelled checkouts and allows a retry', async () => {
    const { client, booking, order } = await pendingBookingWithOrder();
    await client.post('/api/payments/failure').send({ bookingId: booking._id, orderId: order.orderId, reason: 'Checkout closed' }).expect(200);
    let payment = await Payment.findOne({ orderId: order.orderId });
    assert.equal(payment.status, 'failed');
    assert.equal(payment.failedAttempts, 1);

    const retry = await client.post('/api/payments/create-order').send({ bookingId: booking._id });
    assert.equal(retry.body.data.orderId, order.orderId);
    const paid = await mockPay(client, order.orderId);
    await client.post('/api/payments/verify').send({ bookingId: booking._id, orderId: order.orderId, ...paid }).expect(200);
    payment = await Payment.findOne({ orderId: order.orderId });
    assert.equal(payment.status, 'captured');
  });

  it('honours a late payment if the room is still free', async () => {
    const { client, booking, order } = await pendingBookingWithOrder({ inventory: 1 });
    const paid = await mockPay(client, order.orderId);
    await Booking.updateOne({ _id: booking._id }, { expiresAt: new Date(Date.now() - 1000) });
    await expireStalePendingBookings();

    const res = await client.post('/api/payments/verify').send({ bookingId: booking._id, orderId: order.orderId, ...paid });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.booking.status, 'confirmed');
  });

  it('refunds a late payment if the room was sold in the meantime', async () => {
    const { room, client, booking, order } = await pendingBookingWithOrder({ inventory: 1 });
    const paid = await mockPay(client, order.orderId);
    await Booking.updateOne({ _id: booking._id }, { expiresAt: new Date(Date.now() - 1000) });
    await expireStalePendingBookings();
    const { client: rival } = await loggedInClient();
    await rival.post('/api/bookings').send(bookingPayload(room)).expect(201);

    const res = await client.post('/api/payments/verify').send({ bookingId: booking._id, orderId: order.orderId, ...paid });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'BOOKING_NOT_HONOURED');
    const stored = await Booking.findById(booking._id);
    assert.equal(stored.status, 'expired');
    assert.equal(stored.paymentStatus, 'refunded');
  });
});

describe('webhooks', () => {
  const sign = (body) => crypto.createHmac('sha256', env.razorpay.webhookSecret).update(body).digest('hex');

  it('rejects unsigned or forged webhooks', async () => {
    env.razorpay.webhookSecret = 'test-webhook-secret';
    const client = await newClient();
    const body = JSON.stringify({ event: 'payment.captured' });
    const res = await client.agent.post('/api/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'deadbeef').send(body);
    assert.equal(res.status, 400);
  });

  it('confirms bookings from a signed payment.captured event, once', async () => {
    env.razorpay.webhookSecret = 'test-webhook-secret';
    const room = await createRoom();
    const { client, user } = await loggedInClient();
    const booking = (await client.post('/api/bookings').send(bookingPayload(room)).expect(201)).body.data;
    await Payment.create({ booking: booking._id, user: user._id, provider: 'razorpay', orderId: 'order_TEST123', amount: booking.pricing.total, currency: 'INR' });

    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_TEST123', order_id: 'order_TEST123', status: 'captured' } } },
    });
    for (let i = 0; i < 2; i += 1) {
      const res = await (await newClient()).agent
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', sign(body))
        .send(body);
      assert.equal(res.status, 200);
    }
    const stored = await Booking.findById(booking._id);
    assert.equal(stored.status, 'confirmed');
    assert.equal(stored.paymentStatus, 'paid');
    assert.equal((await Payment.findOne({ orderId: 'order_TEST123' })).verifiedVia, 'webhook');
  });
});
