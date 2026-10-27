import { z } from 'zod';
import { email, password, personName, phone } from './common.js';

export const registerSchema = z.object({
  name: personName,
  email,
  phone,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid or has expired'),
  password,
});

export const updateProfileSchema = z
  .object({
    name: personName.optional(),
    phone: phone.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: password,
});
