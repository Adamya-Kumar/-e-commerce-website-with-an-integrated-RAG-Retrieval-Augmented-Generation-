import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';

/**
 * Protects internal chatbot endpoints that must not be exposed to browsers.
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function requireServiceKey(req, _res, next) {
  const expected = process.env.SERVICE_KEY;
  const actual = req.get('X-Service-Key');

  if (!expected) {
    next(ApiError.unauthorized('Service key is not configured'));
    return;
  }

  if (typeof actual !== 'string' || actual.length === 0) {
    next(ApiError.unauthorized('Missing service key'));
    return;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    next(ApiError.unauthorized('Invalid service key'));
    return;
  }

  next();
}
