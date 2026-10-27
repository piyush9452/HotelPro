export class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...opts });
  }

  static unauthorized(message = 'Authentication required', opts) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', ...opts });
  }

  static forbidden(message = 'You do not have permission to perform this action', opts) {
    return new ApiError(403, message, { code: 'FORBIDDEN', ...opts });
  }

  static notFound(message = 'Resource not found', opts) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...opts });
  }

  static conflict(message = 'Conflict', opts) {
    return new ApiError(409, message, { code: 'CONFLICT', ...opts });
  }
}
