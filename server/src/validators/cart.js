import { z } from 'zod';
import { idParamSchema, objectIdSchema } from './common.js';

const qtySchema = z.number().int().min(1).max(999);

export const addCartItemBodySchema = z.object({
  productId: objectIdSchema,
  qty: qtySchema,
});

export const updateCartItemBodySchema = z.object({
  qty: qtySchema,
});

export const cartProductParamsSchema = idParamSchema('productId');
