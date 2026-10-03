import { z } from 'zod';

function blankToUndefined(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}

const optionalText = (max) =>
  z.preprocess(blankToUndefined, z.string().trim().min(1).max(max).optional());

const optionalPaise = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(0).optional(),
);

export const productListQuerySchema = z
  .object({
    q: optionalText(120),
    category: optionalText(80),
    brand: optionalText(80),
    minPrice: optionalPaise,
    maxPrice: optionalPaise,
    inStock: z.preprocess(
      blankToUndefined,
      z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
    ),
    sort: z.preprocess(
      (value) => (value === undefined || value === '' ? 'newest' : value),
      z.enum(['relevance', 'price_asc', 'price_desc', 'newest']),
    ),
    page: z.preprocess(
      (value) => (value === undefined || value === '' ? 1 : value),
      z.coerce.number().int().min(1).max(1000),
    ),
    limit: z.preprocess(
      (value) => (value === undefined || value === '' ? 12 : value),
      z.coerce.number().int().min(1).max(60),
    ),
  })
  .refine(
    (value) =>
      value.minPrice == null ||
      value.maxPrice == null ||
      value.minPrice <= value.maxPrice,
    {
      path: ['minPrice'],
      message: 'minPrice cannot exceed maxPrice',
    },
  );

export const productSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
});
