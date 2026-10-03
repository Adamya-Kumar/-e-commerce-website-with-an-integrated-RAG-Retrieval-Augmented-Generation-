import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

/**
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        assignQuery(req, schemas.query.parse(req.query));
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          ApiError.validation(
            'Validation failed',
            err.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(err);
    }
  };
}

/**
 * Express 5 exposes `req.query` as a getter, so parsed query is assigned this way.
 * @param {import('express').Request} req
 * @param {unknown} value
 */
function assignQuery(req, value) {
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
