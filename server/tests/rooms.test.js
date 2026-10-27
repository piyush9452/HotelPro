import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminClient,
  bookingPayload,
  createRoom,
  day,
  loggedInClient,
  newClient,
  roomPayload,
  useTestDatabase,
} from './helpers/setup.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';

useTestDatabase();

describe('public room catalogue', () => {
  it('lists only active rooms with pagination, filters and sorting', async () => {
    await createRoom({ name: 'Cheap Standard', category: 'standard', pricePerNight: 3000 });
    await createRoom({ name: 'Mid Deluxe', category: 'deluxe', pricePerNight: 6000, amenities: ['Free Wi-Fi', 'Balcony'] });
    await createRoom({ name: 'Grand Suite', category: 'suite', pricePerNight: 20000, maxAdults: 4 });
    await createRoom({ name: 'Hidden Room', isActive: false });

    const client = await newClient();
    const all = await client.get('/api/rooms?sort=price_asc');
    assert.equal(all.status, 200);
    assert.equal(all.body.meta.total, 3);
    assert.deepEqual(all.body.data.map((r) => r.name), ['Cheap Standard', 'Mid Deluxe', 'Grand Suite']);

    const desc = await client.get('/api/rooms?sort=price_desc&limit=1&page=2');
    assert.equal(desc.body.data[0].name, 'Mid Deluxe');
    assert.equal(desc.body.meta.totalPages, 3);

    const filtered = await client.get('/api/rooms?category=deluxe,suite&maxPrice=10000');
    assert.deepEqual(filtered.body.data.map((r) => r.name), ['Mid Deluxe']);

    const amenity = await client.get(`/api/rooms?amenities=${encodeURIComponent('Balcony')}`);
    assert.deepEqual(amenity.body.data.map((r) => r.name), ['Mid Deluxe']);

    const capacity = await client.get('/api/rooms?capacity=4');
    assert.deepEqual(capacity.body.data.map((r) => r.name), ['Grand Suite']);

    const search = await client.get('/api/rooms?q=grand');
    assert.deepEqual(search.body.data.map((r) => r.name), ['Grand Suite']);
  });

  it('hides inactive rooms and handles bad ids', async () => {
    const hidden = await createRoom({ isActive: false });
    const client = await newClient();
    assert.equal((await client.get(`/api/rooms/${hidden._id}`)).status, 404);
    assert.equal((await client.get('/api/rooms/not-an-id')).status, 400);
  });

  it('rejects invalid filters', async () => {
    const client = await newClient();
    assert.equal((await client.get('/api/rooms?category=castle')).status, 400);
    assert.equal((await client.get('/api/rooms?minPrice=500&maxPrice=100')).status, 400);
  });
});

describe('room administration', () => {
  it('requires authentication and the admin role', async () => {
    const anon = await newClient();
    assert.equal((await anon.post('/api/rooms').send(roomPayload())).status, 401);
    const { client } = await loggedInClient();
    assert.equal((await client.post('/api/rooms').send(roomPayload())).status, 403);
  });

  it('creates rooms with server-side validation and writes an audit log', async () => {
    const { client } = await adminClient();
    const invalid = await client.post('/api/rooms').send({ ...roomPayload(), pricePerNight: -5, inventory: 0, category: 'castle' });
    assert.equal(invalid.status, 400);

    const res = await client.post('/api/rooms').send(roomPayload({ roomNumber: 'dlx-1' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.roomNumber, 'DLX-1');
    assert.equal(await AuditLog.countDocuments({ action: 'room.create' }), 1);

    const dup = await client.post('/api/rooms').send(roomPayload({ roomNumber: 'DLX-1' }));
    assert.equal(dup.status, 409);
  });

  it('updates pricing and amenities without changing existing booking prices', async () => {
    const room = await createRoom({ pricePerNight: 5000 });
    const { client: guest } = await loggedInClient();
    const booking = await guest.post('/api/bookings').send(bookingPayload(room));
    const originalTotal = booking.body.data.pricing.total;

    const { client } = await adminClient();
    const res = await client.patch(`/api/rooms/${room._id}`).send({ pricePerNight: 9000, amenities: ['Sea View'] });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.pricePerNight, 9000);
    assert.deepEqual(res.body.data.amenities, ['Sea View']);

    const after = await guest.get(`/api/bookings/${booking.body.data._id}`);
    assert.equal(after.body.data.pricing.total, originalTotal, 'booking keeps its price snapshot');
    assert.equal(after.body.data.pricing.nightlyRate, 5000);
  });

  it('will not reduce inventory below units already booked', async () => {
    const room = await createRoom({ inventory: 3 });
    const { client: guest } = await loggedInClient();
    await guest.post('/api/bookings').send(bookingPayload(room, { rooms: 2, adults: 2 })).expect(201);

    const { client } = await adminClient();
    const res = await client.patch(`/api/rooms/${room._id}`).send({ inventory: 1 });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'INVENTORY_IN_USE');
    await client.patch(`/api/rooms/${room._id}`).send({ inventory: 2 }).expect(200);
  });

  it('deactivates on delete and only hard-deletes rooms without bookings', async () => {
    const { client } = await adminClient();
    const unused = await createRoom();
    const booked = await createRoom();
    const { client: guest } = await loggedInClient();
    await guest.post('/api/bookings').send(bookingPayload(booked)).expect(201);

    const soft = await client.delete(`/api/rooms/${booked._id}`);
    assert.equal(soft.status, 200);
    assert.equal((await Room.findById(booked._id)).isActive, false);

    const blocked = await client.delete(`/api/rooms/${booked._id}?permanent=true`);
    assert.equal(blocked.status, 409);

    await client.delete(`/api/rooms/${unused._id}?permanent=true`).expect(200);
    assert.equal(await Room.findById(unused._id), null);
  });

  it('rejects uploads that are not real images', async () => {
    const room = await createRoom();
    const { client } = await adminClient();
    const res = await client
      .post(`/api/rooms/${room._id}/images`)
      .attach('images', Buffer.from('<?php echo "hi"; ?>'), { filename: 'evil.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_FILE_TYPE');

    const wrongType = await client
      .post(`/api/rooms/${room._id}/images`)
      .attach('images', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    assert.equal(wrongType.status, 400);
  });
});

describe('availability', () => {
  it('calculates remaining units over the whole date range', async () => {
    const room = await createRoom({ inventory: 3 });
    const { client } = await loggedInClient();
    // Night 11 is the busiest: two units held there.
    await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(10), checkOut: day(12) })).expect(201);
    await client.post('/api/bookings').send(bookingPayload(room, { checkIn: day(11), checkOut: day(13) })).expect(201);

    const check = (from, to, rooms = 1) =>
      client.get(`/api/rooms/availability?roomId=${room._id}&checkIn=${day(from)}&checkOut=${day(to)}&adults=${rooms}&rooms=${rooms}`);

    assert.equal((await check(10, 11)).body.data.availableUnits, 2);
    assert.equal((await check(11, 12)).body.data.availableUnits, 1);
    assert.equal((await check(9, 14)).body.data.availableUnits, 1);
    assert.equal((await check(13, 15)).body.data.availableUnits, 3, 'check-out day is free again');
    assert.equal((await check(9, 14, 2)).body.data.isAvailable, false);
  });

  it('flags capacity problems and filters unavailable rooms on request', async () => {
    const small = await createRoom({ name: 'Small', maxAdults: 1, maxChildren: 0 });
    await createRoom({ name: 'Large', maxAdults: 4, maxChildren: 2 });
    const client = await newClient();
    const res = await client.get(`/api/rooms/availability?roomId=${small._id}&checkIn=${day(5)}&checkOut=${day(6)}&adults=2`);
    assert.equal(res.body.data.isAvailable, false);
    assert.match(res.body.data.capacityIssue, /adult/);

    const list = await client.get(`/api/rooms?checkIn=${day(5)}&checkOut=${day(6)}&adults=3&availableOnly=true`);
    assert.deepEqual(list.body.data.map((r) => r.name), ['Large']);
    assert.ok(list.body.data[0].availability.quote.total > 0);
  });

  it('rejects invalid date ranges', async () => {
    const client = await newClient();
    const reversed = await client.get(`/api/rooms/availability?checkIn=${day(5)}&checkOut=${day(3)}`);
    assert.equal(reversed.status, 400);
    const past = await client.get(`/api/rooms/availability?checkIn=${day(-2)}&checkOut=${day(1)}`);
    assert.equal(past.status, 400);
    const malformed = await client.get('/api/rooms/availability?checkIn=2026-02-30&checkOut=2026-03-02');
    assert.equal(malformed.status, 400);
  });
});
