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
    return { title: 1, _id: 1 };
  }
  return { createdAt: -1, _id: 1 };
}

const SEARCH_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'best',
  'buy',
  'can',
  'find',
  'for',
  'get',
  'good',
  'help',
  'in',
  'inr',
  'looking',
  'me',
  'my',
  'need',
  'of',
  'on',
  'ones',
  'or',
  'please',
  'range',
  'rs',
  'rupee',
  'rupees',
  'show',
  'some',
  'suggest',
  'the',
  'to',
  'under',
  'want',
  'with',
  'you',
]);

function tokenToRegex(token) {
  const lower = String(token).toLowerCase();
  const stem = lower.length > 3 && lower.endsWith('s') ? lower.slice(0, -1) : lower;
  return new RegExp(`${escapeRegex(stem)}s?`, 'i');
}

function caseInsensitiveTokenFilter(raw) {
  const seen = new Set();
  const tokens = [];
  for (const part of String(raw).trim().split(/\s+/)) {
    const token = part.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (token.length <= 1 || SEARCH_STOPWORDS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  if (tokens.length === 0) {
    return null;
  }
  const parts = tokens.map((token) => {
    const rx = tokenToRegex(token);
    return {
      $or: [
        { title: rx },
        { brand: rx },
        { tags: rx },
        { slug: rx },
        { description: rx },
      ],
    };
  });
  if (parts.length === 1) {
    return parts[0];
  }
  return { $and: parts };
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
    const textMatch = caseInsensitiveTokenFilter(query.q);
    if (textMatch) {
      Object.assign(filter, textMatch);
    }
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
  const product = await Product.findOne({
    slug: new RegExp(`^${escapeRegex(slug)}$`, 'i'),
    isActive: true,
  }).populate('category', 'name slug');
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return toPublicProduct(product);
}
