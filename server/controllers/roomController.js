import { Room, AMENITIES, BED_TYPES, ROOM_CATEGORIES } from '../models/Room.js';
import { Booking } from '../models/Booking.js';
import { RoomInventory } from '../models/RoomInventory.js';
import { todayInTimezone } from '../utils/dates.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, escapeRegex, paginationMeta, sendSuccess } from '../utils/http.js';
import { calculatePrice } from '../utils/pricing.js';
import { getAvailableUnits } from '../services/inventoryService.js';
import { capacityProblem, parseStayDates } from '../services/stayService.js';
import { recordAudit } from '../services/auditService.js';
import { deleteImage, storeImage } from '../services/uploadService.js';

const SORTS = {
  price_asc: { pricePerNight: 1, _id: 1 },
  price_desc: { pricePerNight: -1, _id: 1 },
  popularity: { popularity: -1, featured: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  capacity: { maxAdults: -1, pricePerNight: 1, _id: 1 },
};

function buildPublicFilter(q) {
  const filter = { isActive: true };
  if (q.category?.length) filter.category = { $in: q.category };
  if (q.amenities?.length) filter.amenities = { $all: q.amenities };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.pricePerNight = {};
    if (q.minPrice !== undefined) filter.pricePerNight.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.pricePerNight.$lte = q.maxPrice;
  }
  if (q.capacity) filter.$expr = { $gte: [{ $add: ['$maxAdults', '$maxChildren'] }, q.capacity] };
  if (q.featured !== undefined) filter.featured = q.featured;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { category: rx }];
  }
  return filter;
}

const guestsFrom = (q) => ({ adults: q.adults ?? 1, children: q.children ?? 0, rooms: q.rooms ?? 1 });

function decorate(room, { stay, guests, available }) {
  const json = room.toJSON();
  if (!stay) return json;
  const problem = capacityProblem(room, guests);
  return {
    ...json,
    availability: {
      availableUnits: available,
      isAvailable: !problem && available >= guests.rooms,
      capacityIssue: problem,
      quote: calculatePrice({ nightlyRate: room.pricePerNight, nights: stay.nights, rooms: guests.rooms }),
    },
  };
}

// GET /api/rooms
export const listRooms = asyncHandler(async (req, res) => {
  const q = req.query;
  if (q.minPrice !== undefined && q.maxPrice !== undefined && q.minPrice > q.maxPrice) {
    throw ApiError.badRequest('Minimum price cannot exceed maximum price');
  }
  const stay = q.checkIn || q.checkOut ? parseStayDates(q.checkIn, q.checkOut) : null;
  const guests = guestsFrom(q);
  const filter = buildPublicFilter(q);
  const sort = SORTS[q.sort];

  let rooms;
  let total;
  let availability = new Map();

  if (stay && q.availableOnly) {
    // Availability depends on the ledger, so filter in memory. The active
    // catalogue of a single hotel is small enough for this to stay cheap.
    const candidates = await Room.find(filter).sort(sort);
    availability = await getAvailableUnits(candidates, stay.checkIn, stay.checkOut);
    const matching = candidates.filter(
      (room) => !capacityProblem(room, guests) && availability.get(room._id.toString()) >= guests.rooms,
    );
    total = matching.length;
    rooms = matching.slice((q.page - 1) * q.limit, q.page * q.limit);
  } else {
    [rooms, total] = await Promise.all([
      Room.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit),
      Room.countDocuments(filter),
    ]);
    if (stay) availability = await getAvailableUnits(rooms, stay.checkIn, stay.checkOut);
  }

  const data = rooms.map((room) => decorate(room, { stay, guests, available: availability.get(room._id.toString()) }));
  sendSuccess(res, { data, meta: { ...paginationMeta(q.page, q.limit, total), nights: stay?.nights } });
});

// GET /api/rooms/meta
export const roomMeta = asyncHandler(async (_req, res) => {
  const [range] = await Room.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, minPrice: { $min: '$pricePerNight' }, maxPrice: { $max: '$pricePerNight' } } },
  ]);
  const counts = await Room.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 }, from: { $min: '$pricePerNight' } } }]);
  sendSuccess(res, {
    data: {
      categories: ROOM_CATEGORIES.map((c) => ({ value: c, count: counts.find((x) => x._id === c)?.count || 0, fromPrice: counts.find((x) => x._id === c)?.from ?? null })),
      amenities: AMENITIES,
      bedTypes: BED_TYPES,
      priceRange: { min: range?.minPrice ?? 0, max: range?.maxPrice ?? 0 },
      policies: {
        currency: env.hotel.currency,
        taxRate: env.hotel.taxRate,
        serviceFeeRate: env.hotel.serviceFeeRate,
        freeCancellationHours: env.hotel.freeCancellationHours,
        checkInHour: env.hotel.checkInHour,
        maxNights: env.hotel.maxNights,
        maxRoomsPerBooking: env.hotel.maxRoomsPerBooking,
        pendingBookingTtlMinutes: env.hotel.pendingBookingTtlMinutes,
        timezone: env.hotel.timezone,
      },
    },
  });
});

// GET /api/rooms/availability
export const checkAvailability = asyncHandler(async (req, res) => {
  const q = req.query;
  const stay = parseStayDates(q.checkIn, q.checkOut);
  const guests = guestsFrom(q);
  const filter = { isActive: true };
  if (q.roomId) filter._id = q.roomId;

  const rooms = await Room.find(filter).sort(SORTS.price_asc);
  if (q.roomId && !rooms.length) throw ApiError.notFound('Room not found');
  const availability = await getAvailableUnits(rooms, stay.checkIn, stay.checkOut);

  const data = rooms.map((room) => {
    const d = decorate(room, { stay, guests, available: availability.get(room._id.toString()) });
    return { roomId: room._id, name: room.name, category: room.category, pricePerNight: room.pricePerNight, ...d.availability };
  });
  sendSuccess(res, {
    data: q.roomId ? data[0] : data,
    meta: { checkIn: q.checkIn, checkOut: q.checkOut, nights: stay.nights, ...guests },
  });
});

// GET /api/rooms/:id
export const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true });
  if (!room) throw ApiError.notFound('Room not found');
  sendSuccess(res, { data: room });
});

// ----- Admin -----

export const adminListRooms = asyncHandler(async (req, res) => {
  const { page, limit, q, category, status } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.isActive = status === 'active';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { roomNumber: rx }, { category: rx }];
  }
  const [rooms, total] = await Promise.all([
    Room.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Room.countDocuments(filter),
  ]);
  sendSuccess(res, { data: rooms, meta: paginationMeta(page, limit, total) });
});

export const adminGetRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  sendSuccess(res, { data: room });
});

export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create(req.body);
  await recordAudit(req, { action: 'room.create', entityType: 'Room', entityId: room._id, details: { name: room.name, roomNumber: room.roomNumber } });
  sendSuccess(res, { status: 201, data: room, message: 'Room created' });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');

  if (req.body.inventory !== undefined && req.body.inventory < room.inventory) {
    const busiest = await RoomInventory.findOne({ room: room._id, date: { $gte: todayInTimezone(env.hotel.timezone) } })
      .sort({ booked: -1 })
      .lean();
    if (busiest && busiest.booked > req.body.inventory) {
      throw ApiError.conflict(
        `Inventory cannot go below ${busiest.booked}: that many units are already booked on ${busiest.date.toISOString().slice(0, 10)}`,
        { code: 'INVENTORY_IN_USE' },
      );
    }
  }

  const changes = {};
  for (const [key, value] of Object.entries(req.body)) {
    const before = room.get(key);
    if (JSON.stringify(before) !== JSON.stringify(value)) changes[key] = key === 'images' || key === 'description' ? '(updated)' : { from: before, to: value };
  }
  room.set(req.body);
  await room.save();
  await recordAudit(req, { action: 'room.update', entityType: 'Room', entityId: room._id, details: changes });
  sendSuccess(res, { data: room, message: 'Room updated' });
});

// DELETE /api/rooms/:id — deactivates by default. `?permanent=true` removes a
// room only if it has never been booked, so booking history stays intact.
export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');

  if (req.query.permanent) {
    if (await Booking.exists({ room: room._id })) {
      throw ApiError.conflict('This room has bookings and cannot be deleted. Deactivate it instead.', { code: 'ROOM_HAS_BOOKINGS' });
    }
    await room.deleteOne();
    await Promise.all(room.images.map((img) => deleteImage(img.publicId)));
    await recordAudit(req, { action: 'room.delete', entityType: 'Room', entityId: room._id, details: { name: room.name } });
    return sendSuccess(res, { message: 'Room permanently deleted' });
  }

  room.isActive = false;
  await room.save();
  await recordAudit(req, { action: 'room.deactivate', entityType: 'Room', entityId: room._id, details: { name: room.name } });
  const upcoming = await Booking.countDocuments({ room: room._id, status: { $in: ['pending', 'confirmed'] } });
  return sendSuccess(res, {
    data: room,
    message: upcoming
      ? `Room deactivated. ${upcoming} existing booking(s) remain valid.`
      : 'Room deactivated. It is hidden from guests and cannot be booked.',
  });
});

export const uploadRoomImages = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  if (!req.files?.length) throw ApiError.badRequest('Select at least one image to upload');
  if (room.images.length + req.files.length > 20) throw ApiError.badRequest('A room can have at most 20 images');

  const stored = [];
  try {
    for (const file of req.files) stored.push(await storeImage(file));
  } catch (err) {
    await Promise.all(stored.map((img) => deleteImage(img.publicId)));
    throw err;
  }
  room.images.push(...stored.map((img) => ({ ...img, alt: room.name })));
  await room.save();
  await recordAudit(req, { action: 'room.images.upload', entityType: 'Room', entityId: room._id, details: { count: stored.length } });
  sendSuccess(res, { status: 201, data: room, message: `${stored.length} image(s) uploaded` });
});

export const deleteRoomImage = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  const image = room.images.id(req.params.imageId);
  if (!image) throw ApiError.notFound('Image not found');
  const { publicId } = image;
  image.deleteOne();
  await room.save();
  await deleteImage(publicId);
  await recordAudit(req, { action: 'room.images.delete', entityType: 'Room', entityId: room._id });
  sendSuccess(res, { data: room, message: 'Image removed' });
});

export const roomBookings = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  const [bookings, total] = await Promise.all([
    Booking.find({ room: room._id }).sort({ checkIn: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email'),
    Booking.countDocuments({ room: room._id }),
  ]);
  sendSuccess(res, { data: { room, bookings }, meta: paginationMeta(page, limit, total) });
});
