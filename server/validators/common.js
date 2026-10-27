import { z } from 'zod';

const humanize = (path) =>
  String(path?.at?.(-1) ?? 'This field')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

// Friendlier messages than Zod's defaults for the most common mistakes.
z.config({
  customError(issue) {
    if (issue.code === 'invalid_type') {
      return issue.input === undefined ? `${humanize(issue.path)} is required` : `${humanize(issue.path)} must be a ${issue.expected}`;
    }
    if (issue.code === 'invalid_value') return `${humanize(issue.path)} has an invalid value`;
    if (issue.code === 'unrecognized_keys') return `Unknown field(s): ${issue.keys.join(', ')}`;
    return undefined;
  },
});

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must use the YYYY-MM-DD format');

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'));
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number');
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number');
export const personName = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);

export const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const optionalSearch = z.string().trim().max(100).optional();

// Query-string booleans arrive as strings.
export const queryBool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
