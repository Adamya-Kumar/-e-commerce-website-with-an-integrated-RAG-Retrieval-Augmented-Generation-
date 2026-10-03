import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details !== undefined) {
      body.error.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formatZodIssues(err),
      },
    });
    return;
  }

  if (isMongoDuplicate(err)) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with that value already exists',
        details: err.keyValue,
      },
    });
    return;
  }

  if (isMongooseValidation(err)) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: Object.values(err.errors).map((item) => ({
          path: item.path,
          message: item.message,
        })),
      },
    });
    return;
  }

  if (err && err.name === 'CastError') {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid value',
        details: [{ path: err.path, message: 'Invalid id' }],
      },
    });
    return;
  }

  logger.error(
    { err, method: req.method, url: req.originalUrl },
    'Unhandled error',
  );

  const message =
    process.env.NODE_ENV === 'production' || !(err instanceof Error)
      ? 'Internal server error'
      : err.message;

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}

/** @param {ZodError} err */
function formatZodIssues(err) {
  return err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/** @param {unknown} err */
function isMongoDuplicate(err) {
  return Boolean(err && typeof err === 'object' && err.code === 11000);
}

/** @param {unknown} err */
function isMongooseValidation(err) {
  return Boolean(
    err &&
    typeof err === 'object' &&
    err.name === 'ValidationError' &&
    err.errors,
  );
}
