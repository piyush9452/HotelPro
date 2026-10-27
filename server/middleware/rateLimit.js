import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (req, res, _next, options) =>
  res.status(options.statusCode).json({
    success: false,
    error: { message: options.message, code: 'RATE_LIMITED' },
  });

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    message,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    // Tests exercise these endpoints repeatedly; a dedicated test covers limiting.
    skip: () => env.isTest && process.env.ENABLE_RATE_LIMIT_IN_TESTS !== 'true',
  });

export const apiLimiter = limiter(15, 600, 'Too many requests. Please slow down and try again shortly.');
export const loginLimiter = limiter(15, 10, 'Too many sign-in attempts. Please try again in 15 minutes.');
export const registerLimiter = limiter(60, 10, 'Too many accounts created from this network. Please try again later.');
export const passwordResetLimiter = limiter(15, 5, 'Too many password reset requests. Please try again in 15 minutes.');
export const contactLimiter = limiter(60, 10, 'Too many messages sent. Please try again later.');
export const paymentLimiter = limiter(15, 60, 'Too many payment requests. Please try again shortly.');
