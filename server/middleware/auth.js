import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/http.js';

const DURATION_RE = /^(\d+)\s*(s|m|h|d)?$/;
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function durationToMs(value) {
  const match = DURATION_RE.exec(String(value).trim());
  if (!match) return UNIT_MS.d;
  return Number(match[1]) * UNIT_MS[match[2] || 's'];
}

export const authCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
});

export function issueAuthCookie(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), v: user.tokenVersion || 0 }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
  res.cookie(env.cookieName, token, { ...authCookieOptions(), maxAge: durationToMs(env.jwtExpiresIn) });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, authCookieOptions());
}

async function resolveUser(req) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.', { code: 'SESSION_EXPIRED' });
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', { code: 'SESSION_INVALID' });
  }
  if ((payload.v ?? 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized('Your password was changed. Please sign in again.', { code: 'SESSION_INVALID' });
  }
  return user;
}

// Resolves the user if a valid session exists; never rejects the request.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = (await resolveUser(req)) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
});

export const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw ApiError.unauthorized();
  req.user = user;
  next();
});

// Role always comes from the database record, never from the request.
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };

export const requireAdmin = [authenticate, authorize('admin')];
