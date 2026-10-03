import { z } from 'zod';
import { ORDER_STATUSES } from '../config/commerce.js';
import { idParamSchema, objectIdSchema } from './common.js';

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

const pageSchema = z.preprocess(
  (value) => (value === undefined || value === '' ? 1 : value),
  z.coerce.number().int().min(1).max(1000),
);

const limitSchema = z.preprocess(
  (value) => (value === undefined || value === '' ? 12 : value),
  z.coerce.number().int().min(1).max(60),
);

const imageSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  publicId: z.string().trim().max(500).optional().default(''),
});

const productFields = {
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().min(1).max(8000),
  category: objectIdSchema,
  brand: z.string().trim().min(1).max(80),
  price: z.number().int().min(0),
  discountPercent: z.number().int().min(0).max(100).optional(),
  stock: z.number().int().min(0),
  images: z.array(imageSchema).max(8).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  attributes: z
    .record(z.string().trim().min(1).max(40), z.string().max(200))
    .optional(),
  isActive: z.boolean().optional(),
};

export const createProductBodySchema = z.object({
  title: productFields.title,
  slug: productFields.slug,
  description: productFields.description,
  category: productFields.category,
  brand: productFields.brand,
  price: productFields.price,
  discountPercent: productFields.discountPercent,
  stock: productFields.stock,
  images: productFields.images,
  tags: productFields.tags,
  attributes: productFields.attributes,
  isActive: productFields.isActive,
});

export const updateProductBodySchema = z
  .object({
    title: productFields.title.optional(),
    slug: productFields.slug,
    description: productFields.description.optional(),
    category: productFields.category.optional(),
    brand: productFields.brand.optional(),
    price: productFields.price.optional(),
    discountPercent: productFields.discountPercent,
    stock: productFields.stock.optional(),
    images: productFields.images,
    tags: productFields.tags,
    attributes: productFields.attributes,
    isActive: productFields.isActive,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(120).optional(),
  image: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategoryBodySchema = createCategoryBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const adminIdParamsSchema = idParamSchema('id');

export const adminProductListQuerySchema = z.object({
  q: optionalText(120),
  category: optionalText(80),
  isActive: z.preprocess(
    blankToUndefined,
    z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  ),
  page: pageSchema,
  limit: limitSchema,
});

export const adminOrderListQuerySchema = z.object({
  status: z.preprocess(
    blankToUndefined,
    z
      .string()
      .refine((value) => ORDER_STATUSES.includes(value), 'Invalid status')
      .optional(),
  ),
  page: pageSchema,
  limit: limitSchema,
});

export const adminOrderStatusBodySchema = z.object({
  status: z
    .string()
    .refine((value) => ORDER_STATUSES.includes(value), 'Invalid status'),
  note: z.string().trim().min(1).max(500).optional(),
});
