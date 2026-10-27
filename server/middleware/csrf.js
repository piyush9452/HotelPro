import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Double-submit token. The token is returned in a JSON body (readable only by
// allowed CORS origins) and mirrored in an HttpOnly cookie. A cross-site
// attacker can make the browser send the cookie but cannot read the body,
// so it cannot supply the matching header. This works even when the client
// and API live on different domains with SameSite=None cookies.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
});

export function issueCsrfToken(req, res) {
  let token = req.cookies?.[env.csrfCookieName];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(env.csrfCookieName, token, cookieOptions());
  }
  res.json({ success: true, data: { csrfToken: token } });
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.[env.csrfCookieName];
  const headerToken = req.get('x-csrf-token');
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return next(ApiError.forbidden('Invalid or missing CSRF token. Please refresh and try again.', { code: 'CSRF_INVALID' }));
  }
  return next();
}
