import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));
}

function normalize(err) {
  if (err instanceof ApiError) return err;
  if (err?.name === 'CastError') return ApiError.badRequest(`Invalid ${err.path}`, { code: 'INVALID_ID' });
  if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest(details[0]?.message || 'Validation failed', { code: 'VALIDATION_ERROR', details });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`A record with this ${field} already exists`, { code: 'DUPLICATE' });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller' : err.message;
    return ApiError.badRequest(message, { code: 'UPLOAD_ERROR' });
  }
  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body', { code: 'INVALID_JSON' });
  if (err?.type === 'entity.too.large') return new ApiError(413, 'Request body is too large', { code: 'PAYLOAD_TOO_LARGE' });
  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const known = normalize(err);
  const status = known?.statusCode || 500;

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} -> ${err?.stack || err}`);

  const body = {
    success: false,
    error: {
      message: known?.message || (env.isProd ? 'Something went wrong. Please try again later.' : err?.message || 'Internal error'),
      code: known?.code || 'INTERNAL_ERROR',
    },
  };
  if (known?.details) body.error.details = known.details;
  if (!env.isProd && !known && err?.stack) body.error.stack = err.stack;

  res.status(status).json(body);
}
