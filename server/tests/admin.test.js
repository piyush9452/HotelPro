import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminClient, bookAndPay, bookingPayload, createRoom, day, loggedInClient, newClient, useTestDatabase } from './helpers/setup.js';
import { AuditLog } from '../models/AuditLog.js';
import { Booking } from '../models/Booking.js';
import { RoomInventory } from '../models/RoomInventory.js';

useTestDatabase();

describe('admin access control', () => {
  it('restricts every admin endpoint to administrators', async () => {
    const anon = await newClient();
    const { client: user } = await loggedInClient();
    for (const path of ['/api/admin/dashboard', '/api/admin/reports', '/api/admin/users', '/api/admin/bookings', '/api/admin/audit-logs']) {
      assert.equal((await anon.get(path)).status, 401, `anon ${path}`);
      assert.equal((await user.get(path)).status, 403, `user ${path}`);
    }
  });
});

describe('dashboard and reports', () => {
  it('returns live KPIs and verified revenue', async () => {
    const room = await createRoom({ inventory: 3, pricePerNight: 1000 });
    const { client: guest } = await loggedInClient();
    const paid = await bookAndPay(guest, room);
    await guest.post('/api/bookings').send(bookingPayload(room)).expect(201);

    const { client } = await adminClient();
    const res = await client.get('/api/admin/dashboard');
    assert.equal(res.status, 200);
    const { kpis, revenue, trend, recentBookings } = res.body.data;
    assert.equal(kpis.totalBookings, 2);
    assert.equal(kpis.confirmedBookings, 1);
    assert.equal(kpis.pendingBookings, 1);
    assert.equal(kpis.totalUnits, 3);
    assert.equal(revenue.gross, paid.pricing.total, 'only the verified payment counts');
    assert.equal(trend.length, 30);
    assert.equal(recentBookings.length, 2);
  });

  it('produces JSON and CSV reports', async () => {
    const room = await createRoom();
    const { client: guest } = await loggedInClient();
    await bookAndPay(guest, room);
    const { client } = await adminClient();

    const revenue = await client.get('/api/admin/reports?type=revenue');
    assert.equal(revenue.status, 200);
    assert.ok(revenue.body.data.summary.gross > 0);

    const csv = await client.get('/api/admin/reports?type=bookings&format=csv');
    assert.equal(csv.status, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text.split('\n')[0], /^Reference,Guest,Email/);
    assert.equal(csv.text.trim().split('\n').length, 2);

    const occupancy = await client.get(`/api/admin/reports?type=occupancy&from=${day(0)}&to=${day(15)}`);
    assert.equal(occupancy.body.data.rows.length, 16);

    const badRange = await client.get(`/api/admin/reports?type=revenue&from=${day(5)}&to=${day(1)}`);
    assert.equal(badRange.status, 400);
  });
});

describe('user management', () => {
  it('lists users without sensitive fields and deactivates accounts', async () => {
    const { client: guest, user } = await loggedInClient({ name: 'Findable Person' });
    const { client, user: admin } = await adminClient();

    const list = await client.get('/api/admin/users?q=findable');
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].password, undefined);

    const res = await client.patch(`/api/admin/users/${user._id}/status`).send({ isActive: false, reason: 'Fraud check' });
    assert.equal(res.status, 200);
    assert.equal((await guest.get('/api/auth/me')).status, 401, 'deactivation ends active sessions');
    assert.equal(await AuditLog.countDocuments({ action: 'user.deactivate' }), 1);

    const self = await client.patch(`/api/admin/users/${admin._id}/status`).send({ isActive: false });
    assert.equal(self.status, 400);
  });
});

describe('booking management', () => {
  it('searches and filters bookings', async () => {
    const room = await createRoom({ inventory: 5 });
    const { client: guest } = await loggedInClient();
    const a = await bookAndPay(guest, room);
    await guest.post('/api/bookings').send(bookingPayload(room)).expect(201);
    const { client } = await adminClient();

    const byRef = await client.get(`/api/admin/bookings?q=${a.reference}`);
    assert.equal(byRef.body.data.length, 1);
    const byStatus = await client.get('/api/admin/bookings?status=pending');
    assert.equal(byStatus.body.data.length, 1);
    const byPayment = await client.get('/api/admin/bookings?paymentStatus=paid');
    assert.equal(byPayment.body.data[0].reference, a.reference);
  });

  it('applies only permitted status transitions and audits them', async () => {
    const room = await createRoom();
    const { client: guest } = await loggedInClient();
    const booking = await bookAndPay(guest, room, { checkIn: day(0), checkOut: day(2) });
    const { client } = await adminClient();

    const skip = await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'checked_out' });
    assert.equal(skip.status, 409);

    await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'checked_in', note: 'Front desk' }).expect(200);
    await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'checked_out' }).expect(200);
    const cancelDone = await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'cancelled' });
    assert.equal(cancelDone.status, 409);

    assert.equal(await AuditLog.countDocuments({ action: 'booking.status', entityId: booking._id }), 2);
    const detail = await client.get(`/api/admin/bookings/${booking._id}`);
    assert.equal(detail.body.data.auditTrail.length, 2);
  });

  it('cannot check guests in before their arrival date', async () => {
    const room = await createRoom();
    const { client: guest } = await loggedInClient();
    const booking = await bookAndPay(guest, room, { checkIn: day(5), checkOut: day(6) });
    const { client } = await adminClient();
    const res = await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'checked_in' });
    assert.equal(res.status, 409);
  });

  it('cancels with a full refund when the hotel cancels', async () => {
    const room = await createRoom({ inventory: 1 });
    const { client: guest } = await loggedInClient();
    const booking = await bookAndPay(guest, room, { checkIn: day(1), checkOut: day(3) });
    const { client } = await adminClient();
    const res = await client.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: 'cancelled', note: 'Maintenance' });
    assert.equal(res.status, 200);
    const stored = await Booking.findById(booking._id);
    assert.equal(stored.cancellation.byRole, 'admin');
    assert.equal(stored.cancellation.refundAmount, booking.pricing.total);
    assert.equal(stored.paymentStatus, 'refunded');
    const held = (await RoomInventory.find({ room: room._id })).reduce((s, r) => s + r.booked, 0);
    assert.equal(held, 0);
  });
});
