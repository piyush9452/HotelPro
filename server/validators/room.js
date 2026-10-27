import { z } from 'zod';
import { AMENITIES, BED_TYPES, ROOM_CATEGORIES } from '../models/Room.js';
import { dateOnly, objectId, optionalSearch, pagination, queryBool } from './common.js';

const imageInput = z.object({
  url: z.url({ protocol: /^https?$/, message: 'Image URLs must be valid http(s) links' }).max(1000),
  publicId: z.string().max(300).optional(),
  alt: z.string().trim().max(200).optional(),
});

const roomFields = {
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  roomNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,20}$/, 'Room number may contain letters, numbers and dashes only'),
  category: z.enum(ROOM_CATEGORIES),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(3000),
  pricePerNight: z.number().positive('Price must be greater than 0').max(1000000),
  maxAdults: z.number().int().min(1).max(10),
  maxChildren: z.number().int().min(0).max(10),
  bedType: z.enum(BED_TYPES),
  beds: z.number().int().min(1).max(10),
  size: z.number().min(0).max(20000).optional(),
  view: z.string().trim().max(60).optional(),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
  images: z.array(imageInput).max(20),
  inventory: z.number().int().min(1, 'Inventory must be at least 1').max(500),
  isActive: z.boolean(),
  featured: z.boolean(),
};

export const createRoomSchema = z.object({
  ...roomFields,
  amenities: roomFields.amenities.default([]),
  images: roomFields.images.default([]),
  isActive: roomFields.isActive.default(true),
  featured: roomFields.featured.default(false),
});

// PATCH: every field optional, no defaults injected.
export const updateRoomSchema = z
  .object(roomFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

const stayQuery = {
  checkIn: dateOnly.optional(),
  checkOut: dateOnly.optional(),
  adults: z.coerce.number().int().min(1).max(50).optional(),
  children: z.coerce.number().int().min(0).max(50).optional(),
  rooms: z.coerce.number().int().min(1).max(20).optional(),
};

const listOf = (allowed) =>
  z
    .string()
    .max(500)
    .transform((value) => value.split(',').map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.enum(allowed)))
    .optional();

export const listRoomsQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(50).default(9),
  ...stayQuery,
  q: optionalSearch,
  category: listOf(ROOM_CATEGORIES),
  amenities: listOf(AMENITIES),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  capacity: z.coerce.number().int().min(1).max(20).optional(),
  featured: queryBool,
  availableOnly: queryBool,
  sort: z.enum(['price_asc', 'price_desc', 'popularity', 'newest', 'capacity']).default('popularity'),
});

export const availabilityQuery = z.object({
  checkIn: dateOnly,
  checkOut: dateOnly,
  adults: z.coerce.number().int().min(1).max(50).default(1),
  children: z.coerce.number().int().min(0).max(50).default(0),
  rooms: z.coerce.number().int().min(1).max(20).default(1),
  roomId: objectId.optional(),
});

export const adminListRoomsQuery = z.object({
  ...pagination,
  q: optionalSearch,
  category: z.enum(ROOM_CATEGORIES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const deleteRoomQuery = z.object({ permanent: queryBool });

export const imageParams = z.object({ id: objectId, imageId: objectId });
