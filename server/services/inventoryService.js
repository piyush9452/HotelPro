import { RoomInventory } from '../models/RoomInventory.js';
import { eachNight } from '../utils/dates.js';

// Make sure a ledger row exists for every night. Concurrent upserts on the
// same (room, date) can race into a duplicate-key error; that's harmless
// because the row now exists either way.
async function ensureLedgerRows(roomId, nights) {
  try {
    await RoomInventory.bulkWrite(
      nights.map((date) => ({
        updateOne: {
          filter: { room: roomId, date },
          update: { $setOnInsert: { booked: 0 } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  } catch (err) {
    const onlyDuplicates = err?.code === 11000 || err?.writeErrors?.every?.((e) => e.code === 11000);
    if (!onlyDuplicates) throw err;
  }
}

/**
 * Atomically reserves `units` of a room type for every night in [checkIn, checkOut).
 * Each night is a conditional $inc that only succeeds while capacity remains,
 * so concurrent requests can never push `booked` above `capacity`. If any
 * night is full, nights already taken by this call are released again.
 */
export async function reserveInventory({ roomId, capacity, checkIn, checkOut, units }) {
  const nights = eachNight(checkIn, checkOut);
  if (units > capacity) return false;
  await ensureLedgerRows(roomId, nights);

  const reserved = [];
  for (const date of nights) {
    const result = await RoomInventory.updateOne(
      { room: roomId, date, booked: { $lte: capacity - units } },
      { $inc: { booked: units } },
    );
    if (result.modifiedCount !== 1) {
      if (reserved.length) {
        await RoomInventory.updateMany({ room: roomId, date: { $in: reserved } }, { $inc: { booked: -units } });
      }
      return false;
    }
    reserved.push(date);
  }
  return true;
}

export async function releaseInventory({ roomId, checkIn, checkOut, units }) {
  const nights = eachNight(checkIn, checkOut);
  await RoomInventory.updateMany(
    { room: roomId, date: { $in: nights }, booked: { $gte: units } },
    { $inc: { booked: -units } },
  );
}

/**
 * Units still free for the whole stay, per room: inventory minus the busiest night.
 * @returns {Promise<Map<string, number>>}
 */
export async function getAvailableUnits(rooms, checkIn, checkOut) {
  if (!rooms.length) return new Map();
  const peaks = await RoomInventory.aggregate([
    { $match: { room: { $in: rooms.map((r) => r._id) }, date: { $gte: checkIn, $lt: checkOut } } },
    { $group: { _id: '$room', peak: { $max: '$booked' } } },
  ]);
  const peakByRoom = new Map(peaks.map((p) => [p._id.toString(), p.peak]));
  return new Map(
    rooms.map((room) => [room._id.toString(), Math.max(0, room.inventory - (peakByRoom.get(room._id.toString()) || 0))]),
  );
}
