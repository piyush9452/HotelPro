import { z } from 'zod';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../models/Booking.js';
import { dateOnly, email, objectId, optionalSearch, pagination, phone } from './common.js';

// Note: there is deliberately no price, status or user field. Those are server-owned.
export const createBookingSchema = z.object({
  roomId: objectId,
  checkIn: dateOnly,
  checkOut: dateOnly,
  adults: z.number().int().min(1, 'At least one adult is required').max(50),
  children: z.number().int().min(0).max(50).default(0),
  rooms: z.number().int().min(1, 'Book at least one room').max(20),
  guest: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(60),
    lastName: z.string().trim().min(1, 'Last name is required').max(60),
    email,
    phone,
    specialRequests: z.string().trim().max(500).optional().default(''),
  }),
  idempotencyKey: z
    .string()
    .regex(/^[A-Za-z0-9-]{8,100}$/, 'Invalid idempotency key')
    .optional(),
});

export const myBookingsQuery = z.object({
  ...pagination,
  status: z.enum(['upcoming', 'past', 'cancelled', ...BOOKING_STATUSES]).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional().default(''),
});

export const adminBookingsQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: optionalSearch,
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  dateField: z.enum(['checkIn', 'createdAt']).default('checkIn'),
  room: objectId.optional(),
  user: objectId.optional(),
});

// Admins may only move bookings along real-world stay transitions.
export const ADMIN_STATUS_TRANSITIONS = {
  confirmed: ['checked_in', 'no_show'],
  checked_in: ['checked_out'],
};

export const adminStatusSchema = z.object({
  status: z.enum(['checked_in', 'checked_out', 'no_show', 'cancelled']),
  note: z.string().trim().max(500).optional().default(''),
});
