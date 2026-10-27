import './env.js';
import { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app.js';
import { User } from '../../models/User.js';
import { Room } from '../../models/Room.js';
import { env } from '../../config/env.js';
import { addDays, formatDateOnly, todayInTimezone } from '../../utils/dates.js';

export const app = createApp();
let mongo;

/** Registers hooks for an isolated in-memory MongoDB per test file. */
export function useTestDatabase() {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });
  after(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });
}

/** A supertest agent that keeps cookies and sends the CSRF header automatically. */
export async function newClient() {
  const agent = request.agent(app);
  const res = await agent.get('/api/csrf-token');
  const token = res.body.data.csrfToken;
  const withCsrf = (method) => (url) => agent[method](url).set('X-CSRF-Token', token);
  return {
    agent,
    csrf: token,
    get: (url) => agent.get(url),
    post: withCsrf('post'),
    patch: withCsrf('patch'),
    delete: withCsrf('delete'),
  };
}

let counter = 0;
export const PASSWORD = 'Password123';

export async function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    name: `Guest ${counter}`,
    email: `guest${counter}@example.com`,
    phone: '9876543210',
    password: PASSWORD,
    ...overrides,
  });
}

export async function loggedInClient(overrides = {}) {
  const user = await createUser(overrides);
  const client = await newClient();
  const res = await client.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  return { client, user };
}

export const adminClient = () => loggedInClient({ role: 'admin', name: 'Admin User' });

export function roomPayload(overrides = {}) {
  counter += 1;
  return {
    name: `Test Deluxe ${counter}`,
    roomNumber: `T-${counter}`,
    category: 'deluxe',
    description: 'A comfortable test room with plenty of space and natural light.',
    pricePerNight: 5000,
    maxAdults: 2,
    maxChildren: 1,
    bedType: 'king',
    beds: 1,
    amenities: ['Free Wi-Fi'],
    inventory: 2,
    ...overrides,
  };
}

export const createRoom = (overrides) => Room.create(roomPayload(overrides));

/** "YYYY-MM-DD" n days from today in the hotel timezone. */
export const day = (n) => formatDateOnly(addDays(todayInTimezone(env.hotel.timezone), n));

export function bookingPayload(room, overrides = {}) {
  return {
    roomId: room._id.toString(),
    checkIn: day(10),
    checkOut: day(12),
    adults: 2,
    children: 0,
    rooms: 1,
    guest: { firstName: 'Test', lastName: 'Guest', email: 'test@example.com', phone: '9876543210' },
    ...overrides,
  };
}

/** Creates a pending booking and pays it via the development mock gateway. */
export async function bookAndPay(client, room, overrides) {
  const booking = await client.post('/api/bookings').send(bookingPayload(room, overrides));
  if (booking.status !== 201) throw new Error(`booking failed: ${JSON.stringify(booking.body)}`);
  const order = await client.post('/api/payments/create-order').send({ bookingId: booking.body.data._id });
  const checkout = await client.post('/api/payments/mock/checkout').send({ orderId: order.body.data.orderId, outcome: 'success' });
  const verify = await client.post('/api/payments/verify').send({
    bookingId: booking.body.data._id,
    orderId: order.body.data.orderId,
    paymentId: checkout.body.data.paymentId,
    signature: checkout.body.data.signature,
  });
  if (verify.status !== 200) throw new Error(`verify failed: ${JSON.stringify(verify.body)}`);
  return verify.body.data.booking;
}
