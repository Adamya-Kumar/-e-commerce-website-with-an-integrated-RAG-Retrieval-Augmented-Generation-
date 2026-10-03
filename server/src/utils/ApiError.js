export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** @param {string} [message] @param {unknown} [details] */
  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  /** @param {string} [message] */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  /** @param {string} [message] */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /** @param {string} [message] */
  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /** @param {string} [message] @param {unknown} [details] */
  static conflict(message = 'Conflict', details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  /** @param {string} [message] @param {unknown} [details] */
  static validation(message = 'Validation failed', details) {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }

  /** @param {string} [message] */
  static tooManyRequests(message = 'Too many attempts. Try again later.') {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }
}
