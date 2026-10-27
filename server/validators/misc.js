import { z } from 'zod';
import { dateOnly, email, objectId, optionalSearch, pagination, personName } from './common.js';

export const contactSchema = z.object({
  name: personName,
  email,
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s-]{7,20})?$/, 'Enter a valid phone number')
    .optional()
    .default(''),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
});

export const createOrderSchema = z.object({ bookingId: objectId });

export const verifyPaymentSchema = z.object({
  bookingId: objectId,
  orderId: z.string().trim().min(1).max(100),
  paymentId: z.string().trim().min(1).max(100),
  signature: z.string().trim().regex(/^[a-f0-9]{64}$/, 'Invalid payment signature'),
});

export const paymentFailureSchema = z.object({
  bookingId: objectId,
  orderId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(300).optional().default('Payment was not completed'),
});

export const mockCheckoutSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  outcome: z.enum(['success', 'failure']),
});

export const adminUsersQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: optionalSearch,
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(300).optional().default(''),
});

export const reportsQuery = z.object({
  type: z.enum(['revenue', 'bookings', 'occupancy', 'cancellations']).default('revenue'),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const auditLogsQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(40).optional(),
  entityId: objectId.optional(),
});

export const contactListQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['new', 'read', 'resolved']).optional(),
  q: optionalSearch,
});

export const contactStatusSchema = z.object({ status: z.enum(['new', 'read', 'resolved']) });
