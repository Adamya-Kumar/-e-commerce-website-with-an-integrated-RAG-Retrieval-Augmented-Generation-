import { z } from 'zod';
import { idParamSchema, objectIdSchema } from './common.js';

/** Extra keys (prices, items, totals) are stripped and never read. */
export const placeOrderBodySchema = z
  .object({
    addressId: objectIdSchema,
  })
  .strip();

export const orderParamsSchema = idParamSchema('id');

export const cancelOrderBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strip();

export const returnOrderBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strip();
