import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * @param {unknown} value
 */
function plainAttributes(value) {
  if (!value) {
    return {};
  }
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}

/** @param {import('mongoose').Document} product */
export function toPublicProduct(product) {
  const json = product.toJSON();
  json.attributes = plainAttributes(json.attributes);
  return json;
}

export async function listActiveCategories() {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  return categories.map((category) => category.toJSON());
}

/**
 * @param {string} sort
 * @param {boolean} hasQuery
 */
function buildSort(sort, hasQuery) {
  if (sort === 'price_asc') {
    return { price: 1, _id: 1 };
  }
  if (sort === 'price_desc') {
    return { price: -1, _id: 1 };
  }
  if (sort === 'relevance' && hasQuery) {
    return { score: { $meta: 'textScore' } };
  }
  return { createdAt: -1, _id: 1 };
}

/** @param {string} value */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {{
 *   q?: string,
 *   category?: string,
 *   brand?: string,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   inStock?: boolean,
 *   sort: string,
 *   page: number,
 *   limit: number,
 * }} query
 */
export async function searchProducts(query) {
  const filter = { isActive: true };

  if (query.category) {
    const category = await Category.findOne({
      slug: query.category,
      isActive: true,
    });
    if (!category) {
      return emptyPage(query);
    }
    filter.category = category._id;
  }

  if (query.brand) {
    filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, 'i');
  }

  if (query.minPrice != null || query.maxPrice != null) {
    filter.price = {};
    if (query.minPrice != null) {
      filter.price.$gte = query.minPrice;
    }
    if (query.maxPrice != null) {
      filter.price.$lte = query.maxPrice;
    }
  }

  if (query.inStock === true) {
    filter.stock = { $gt: 0 };
  } else if (query.inStock === false) {
    filter.stock = 0;
  }

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  const [total, docs] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(buildSort(query.sort, Boolean(query.q)))
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('category', 'name slug'),
  ]);

  return {
    products: docs.map(toPublicProduct),
    meta: pageMeta(query, total),
  };
}

/**
 * @param {{ page: number, limit: number }} query
 * @param {number} total
 */
function pageMeta(query, total) {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}

/** @param {{ page: number, limit: number }} query */
function emptyPage(query) {
  return {
    products: [],
    meta: pageMeta(query, 0),
  };
}

/** @param {string} slug */
export async function getActiveProductBySlug(slug) {
  const product = await Product.findOne({ slug, isActive: true }).populate(
    'category',
    'name slug',
  );
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return toPublicProduct(product);
}
