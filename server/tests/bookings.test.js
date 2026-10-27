import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookAndPay,
  bookingPayload,
  createRoom,
  createUser,
  day,
  loggedInClient,
  newClient,
  useTestDatabase,
} from './helpers/setup.js';
import { Booking } from '../models/Booking.js';
import { RoomInventory } from '../models/RoomInventory.js';
import { expireStalePendingBookings } from '../services/bookingService.js';
import { PASSWORD } from './helpers/setup.js';

useTestDatabase();

const heldUnits = async (room) => (await RoomInventory.find({ room: room._id })).reduce((s, r) => s + r.booked, 0);

describe('booking creation', () => {
  it('requires authentication', async () => {
    const room = await createRoom();
    const res = await (await newClient()).post('/api/bookings').send(bookingPayload(room));
    assert.equal(res.status, 401);
  });

  it('calculates the price on the server and ignores client-supplied prices and statuses', async () => {
    const room = await createRoom({ pricePerNight: 5000 });
    const { client, user } = await loggedInClient();
    const res = await client.post('/api/bookings').send({
      ...bookingPayload(room, { checkIn: day(10), checkOut: day(13), rooms: 2, adults: 3 }),
      pricing: { total: 1 },
      total: 1,
      status: 'confirmed',
      paymentStatus: 'paid',
      user: '000000000000000000000000',
    });
    assert.equal(res.status, 201);
    const b = res.body.data;
    // 5000 x 3 nights x 2 rooms = 30000; 12% tax = 3600; 3% fee = 900
    assert.equal(b.nights, 3);
    assert.equal(b.pricing.subtotal, 30000);
    assert.equal(b.pricing.taxes, 3600);
    assert.equal(b.pricing.serviceFee, 900);
    assert.equal(b.pricing.total, 34500);
    assert.equal(b.status, 'pending');
    assert.equal(b.paymentStatus, 'unpaid');
    assert.equal(b.user, user._id.toString());
    assert.match(b.reference, /^HP\d{6}-[A-Z2-9]{6}$/);
    assert.ok(new Date(b.expiresAt) > new Date());
  });

  it('rejects invalid dates', async () => {
    const room = await createRoom();
    const { client } = await loggedInClient();
    const cases = [
      { checkIn: day(5), checkOut: day(5) },
      { checkIn: day(5), checkOut: day(3) },
      { checkIn: day(-1), checkOut: day(2) },
      { checkIn: day(1), checkOut: day(60) },
      { checkIn: '2026-13-01', checkOut: '2026-13-03' },
    ];
    for (const dates of cases) {
      const res = await client.post('/api/bookings').send(bookingPayload(room, dates));
      assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(dates)}`);
    }
    assert.equal(await Booking.countDocuments(), 0);
  });

  it('accepts check-in today', async () => {
    const room = await createRoom();
    const { client } = await loggedInClient();
    const res = await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(0), checkOut: day(1) }));
    assert.equal(res.status, 201);
  });

  it('enforces room capacity', async () => {
    const room = await createRoom({ maxAdults: 2, maxChildren: 1 });
    const { client } = await loggedInClient();
    const tooMany = await client.post('/api/bookings').send(bookingPayload(room, { adults: 3, rooms: 1 }));
    assert.equal(tooMany.status, 400);
    assert.equal(tooMany.body.error.code, 'CAPACITY_EXCEEDED');
    const kids = await client.post('/api/bookings').send(bookingPayload(room, { adults: 1, children: 2, rooms: 1 }));
    assert.equal(kids.status, 400);
    const ok = await client.post('/api/bookings').send(bookingPayload(room, { adults: 3, children: 2, rooms: 2 }));
    assert.equal(ok.status, 201);
  });

  it('refuses inactive rooms', async () => {
    const room = await createRoom({ isActive: false });
    const { client } = await loggedInClient();
    assert.equal((await client.post('/api/bookings').send(bookingPayload(room))).status, 404);
  });
});

describe('inventory safety', () => {
  it('prevents overlapping bookings from exceeding inventory', async () => {
    const room = await createRoom({ inventory: 1 });
    const { client } = await loggedInClient();
    await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(10), checkOut: day(13) })).expect(201);

    const overlap = await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(12), checkOut: day(14) }));
    assert.equal(overlap.status, 409);
    assert.equal(overlap.body.error.code, 'NOT_AVAILABLE');

    // Back-to-back stays do not overlap.
    await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(13), checkOut: day(15) })).expect(201);
    await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(8), checkOut: day(10) })).expect(201);
  });

  it('never overbooks under concurrent requests', async () => {
    const room = await createRoom({ inventory: 2 });
    const clients = await Promise.all(Array.from({ length: 8 }, () => loggedInClient()));
    const results = await Promise.all(
      clients.map(({ client }, i) =>
        client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(20 + (i % 2)), checkOut: day(23) })),
      ),
    );
    const created = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;
    assert.equal(created, 2);
    assert.equal(rejected, 6);

    const rows = await RoomInventory.find({ room: room._id });
    for (const row of rows) assert.ok(row.booked <= 2, `night ${row.date.toISOString()} has ${row.booked} booked`);
  });

  it('treats repeated submissions with the same idempotency key as one booking', async () => {
    const room = await createRoom({ inventory: 5 });
    const { client } = await loggedInClient();
    const payload = bookingPayload(room, { idempotencyKey: 'a1b2c3d4-0000-4000-8000-000000000001' });
    const [a, b] = await Promise.all([client.post('/api/bookings').send(payload), client.post('/api/bookings').send(payload)]);
    assert.deepEqual([a.status, b.status].sort(), [200, 201]);
    assert.equal(a.body.data._id, b.body.data._id);
    assert.equal(await Booking.countDocuments(), 1);
    assert.equal(await heldUnits(room), 2, 'one unit for each of two nights');
  });

  it('expires unpaid bookings and returns their rooms to inventory', async () => {
    const room = await createRoom({ inventory: 1 });
    const { client } = await loggedInClient();
    const res = await client.post('/api/bookings').send(bookingPayload(room)).expect(201);
    await Booking.updateOne({ _id: res.body.data._id }, { expiresAt: new Date(Date.now() - 1000) });

    assert.equal(await expireStalePendingBookings(), 1);
    assert.equal((await Booking.findById(res.body.data._id)).status, 'expired');
    assert.equal(await heldUnits(room), 0);
    assert.equal(await expireStalePendingBookings(), 0, 'sweeping twice releases nothing more');

    await client.post('/api/bookings').send(bookingPayload(room)).expect(201);
  });
});

describe('ownership', () => {
  it('only lets owners (and admins) see or cancel a booking', async () => {
    const room = await createRoom();
    const { client: owner } = await loggedInClient();
    const { client: other } = await loggedInClient();
    const res = await owner.post('/api/bookings').send(bookingPayload(room)).expect(201);
    const id = res.body.data._id;

    assert.equal((await other.get(`/api/bookings/${id}`)).status, 404);
    assert.equal((await other.post(`/api/bookings/${id}/cancel`).send({})).status, 404);
    assert.equal((await owner.get(`/api/bookings/${id}`)).status, 200);

    const mine = await other.get('/api/bookings/my');
    assert.equal(mine.body.data.length, 0);
    const ownerList = await owner.get('/api/bookings/my');
    assert.equal(ownerList.body.data.length, 1);
  });
});

describe('cancellation', () => {
  it('cancels an unpaid booking and releases inventory', async () => {
    const room = await createRoom({ inventory: 1 });
    const { client } = await loggedInClient();
    const res = await client.post('/api/bookings').send(bookingPayload(room)).expect(201);
    const cancel = await client.post(`/api/bookings/${res.body.data._id}/cancel`).send({ reason: 'Changed plans' });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.data.status, 'cancelled');
    assert.equal(cancel.body.data.cancellation.reason, 'Changed plans');
    assert.equal(await heldUnits(room), 0);

    const twice = await client.post(`/api/bookings/${res.body.data._id}/cancel`).send({});
    assert.equal(twice.status, 409);
  });

  it('refunds paid bookings in full well before check-in', async () => {
    const room = await createRoom();
    const { client } = await loggedInClient();
    const booking = await bookAndPay(client, room, { checkIn: day(20), checkOut: day(22) });
    const res = await client.post(`/api/bookings/${booking._id}/cancel`).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.data.cancellation.fee, 0);
    assert.equal(res.body.data.cancellation.refundAmount, booking.pricing.total);
    assert.equal(res.body.data.paymentStatus, 'refunded');
  });

  it('charges one night for late cancellations', async () => {
    const room = await createRoom({ pricePerNight: 4000 });
    const { client } = await loggedInClient();
    const booking = await bookAndPay(client, room, { checkIn: day(1), checkOut: day(3) });
    const res = await client.post(`/api/bookings/${booking._id}/cancel`).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.data.cancellation.fee, booking.pricing.total / 2);
    assert.equal(res.body.data.cancellation.refundAmount, booking.pricing.total / 2);
    assert.equal(res.body.data.paymentStatus, 'partially_refunded');
  });

  it('does not let guests cancel after check-in time has passed', async () => {
    const room = await createRoom();
    const user = await createUser();
    const client = await newClient();
    await client.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    const res = await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(0), checkOut: day(2) })).expect(201);
    // Simulate a booking whose check-in was yesterday.
    await Booking.updateOne({ _id: res.body.data._id }, { checkIn: new Date(`${day(-1)}T00:00:00Z`) });
    const cancel = await client.post(`/api/bookings/${res.body.data._id}/cancel`).send({});
    assert.equal(cancel.status, 409);
    assert.equal(cancel.body.error.code, 'CANCELLATION_NOT_ALLOWED');
  });
});
