import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** @param {string} name */
export function idParamSchema(name) {
  return z.object({
    [name]: objectIdSchema,
  });
}
