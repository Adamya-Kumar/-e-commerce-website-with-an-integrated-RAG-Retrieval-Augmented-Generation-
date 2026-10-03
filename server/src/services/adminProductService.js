import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { pageMeta } from '../utils/pagination.js';
import { toPublicProduct } from './catalogService.js';
import { deleteProductImage } from './cloudinaryService.js';
import { onProductChanged } from './productHooks.js';

/**
 * @param {{
 *   q?: string,
 *   category?: string,
 *   isActive?: boolean,
 *   page: number,
 *   limit: number,
 * }} query
 */
export async function listProducts(query) {
  const filter = {};

  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    if (!category) {
      return { products: [], meta: pageMeta(query, 0) };
    }
    filter.category = category._id;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ title: pattern }, { brand: pattern }, { slug: pattern }];
  }

  const [total, docs] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('category', 'name slug'),
  ]);

  return {
    products: docs.map(toPublicProduct),
    meta: pageMeta(query, total),
  };
}

/** @param {string} id */
export async function getProduct(id) {
  const product = await Product.findById(id).populate('category', 'name slug');
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return toPublicProduct(product);
}

/**
 * @param {Record<string, unknown>} input
 */
export async function createProduct(input) {
  await assertCategory(input.category);
  let created;
  try {
    created = await Product.create(input);
  } catch (err) {
    throw mapDuplicate(err);
  }
  const product = await loadProduct(created._id);
  await emitProductChanged(product);
  return product;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} input
 */
export async function updateProduct(id, input) {
  const existing = await Product.findById(id);
  if (!existing) {
    throw ApiError.notFound('Product not found');
  }
  if (input.category) {
    await assertCategory(input.category);
  }
  if (input.images) {
    await removeDroppedImages(existing.images, input.images);
  }

  Object.assign(existing, input);
  try {
    await existing.save();
  } catch (err) {
    throw mapDuplicate(err);
  }

  const product = await loadProduct(existing._id);
  await emitProductChanged(product);
  return product;
}

/** @param {string} id */
export async function deleteProduct(id) {
  const existing = await Product.findById(id).populate('category', 'name slug');
  if (!existing) {
    throw ApiError.notFound('Product not found');
  }
  const snapshot = toPublicProduct(existing);
  for (const image of existing.images) {
    if (image.publicId) {
      await deleteProductImage(image.publicId);
    }
  }
  await existing.deleteOne();
  await emitProductChanged(snapshot);
  return snapshot;
}

/** @param {unknown} categoryId */
async function assertCategory(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
}

/** @param {import('mongoose').Types.ObjectId} id */
async function loadProduct(id) {
  const product = await Product.findById(id).populate('category', 'name slug');
  return toPublicProduct(product);
}

/**
 * @param {{ publicId?: string }[]} previous
 * @param {{ publicId?: string }[]} next
 */
async function removeDroppedImages(previous, next) {
  const keep = new Set(
    (next || []).map((image) => image.publicId).filter(Boolean),
  );
  for (const image of previous || []) {
    if (image.publicId && !keep.has(image.publicId)) {
      await deleteProductImage(image.publicId);
    }
  }
}

/** @param {object} product */
async function emitProductChanged(product) {
  try {
    await onProductChanged(product);
  } catch (err) {
    logger.error({ err, productId: product?.id }, 'onProductChanged failed');
  }
}

/** @param {unknown} err */
function mapDuplicate(err) {
  if (err && typeof err === 'object' && err.code === 11000) {
    return ApiError.conflict('A product with that slug already exists');
  }
  return err;
}

/** @param {string} value */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
