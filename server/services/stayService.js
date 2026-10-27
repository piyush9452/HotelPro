import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, nightsBetween, parseDateOnly, todayInTimezone } from '../utils/dates.js';

/**
 * Validates a requested stay against the hotel's date rules.
 * @returns {{ checkIn: Date, checkOut: Date, nights: number }}
 */
export function parseStayDates(checkInRaw, checkOutRaw, now = new Date()) {
  const checkIn = parseDateOnly(checkInRaw);
  const checkOut = parseDateOnly(checkOutRaw);
  if (!checkIn || !checkOut) throw ApiError.badRequest('Please provide valid check-in and check-out dates', { code: 'INVALID_DATES' });
  if (checkOut <= checkIn) throw ApiError.badRequest('Check-out must be after check-in', { code: 'INVALID_DATES' });

  const today = todayInTimezone(env.hotel.timezone, now);
  if (checkIn < today) throw ApiError.badRequest('Check-in date cannot be in the past', { code: 'INVALID_DATES' });
  if (checkIn > addDays(today, env.hotel.bookingWindowDays)) {
    throw ApiError.badRequest(`Bookings open up to ${env.hotel.bookingWindowDays} days in advance`, { code: 'INVALID_DATES' });
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights > env.hotel.maxNights) {
    throw ApiError.badRequest(`Stays are limited to ${env.hotel.maxNights} nights per booking`, { code: 'INVALID_DATES' });
  }
  return { checkIn, checkOut, nights };
}

export function capacityProblem(room, { adults, children = 0, rooms }) {
  if (rooms > env.hotel.maxRoomsPerBooking) return `You can book at most ${env.hotel.maxRoomsPerBooking} rooms at once`;
  if (rooms > room.inventory) return `Only ${room.inventory} ${room.name} room(s) exist`;
  if (adults < rooms) return 'Each room needs at least one adult';
  if (adults > room.maxAdults * rooms) {
    return `${room.name} fits up to ${room.maxAdults} adult(s) per room. Add rooms or choose a larger room.`;
  }
  if (children > room.maxChildren * rooms) {
    return `${room.name} fits up to ${room.maxChildren} child(ren) per room. Add rooms or choose a larger room.`;
  }
  return null;
}

export function assertCapacity(room, guests) {
  const problem = capacityProblem(room, guests);
  if (problem) throw ApiError.badRequest(problem, { code: 'CAPACITY_EXCEEDED' });
}
