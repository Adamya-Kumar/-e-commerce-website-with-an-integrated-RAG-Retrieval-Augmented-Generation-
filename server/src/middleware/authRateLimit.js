import { rateLimit } from 'express-rate-limit';
import { AUTH_ATTEMPT_LIMIT, AUTH_ATTEMPT_WINDOW_MS } from '../config/auth.js';
import { ApiError } from '../utils/ApiError.js';

export const authAttemptLimiter = rateLimit({
  windowMs: AUTH_ATTEMPT_WINDOW_MS,
  limit: AUTH_ATTEMPT_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res, _next, options) => {
    const error = ApiError.tooManyRequests();
    res.status(options.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  },
});
