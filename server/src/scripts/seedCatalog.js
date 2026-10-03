import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDb } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { toSlug } from '../utils/slug.js';
import { logger } from '../utils/logger.js';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './catalogSeedData.js';

const upsertOptions = {
  upsert: true,
  returnDocument: 'after',
  runValidators: true,
  setDefaultsOnInsert: true,
};

/** Placeholder until Cloudinary uploads land in P1-07. */
function placeholderImage(title) {
  return {
    url: `https://placehold.co/800x800/png?text=${encodeURIComponent(title)}`,
    publicId: '',
  };
}

export async function seedCatalog() {
  /** @type {Map<string, import('mongoose').Types.ObjectId>} */
  const categoryIds = new Map();
  /** @type {string[]} */
  const categoryResultIds = [];

  for (const category of SEED_CATEGORIES) {
    const slug = toSlug(category.name);
    const doc = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: category.name,
          slug,
          image: category.image,
          isActive: true,
        },
      },
      upsertOptions,
    );
    categoryIds.set(slug, doc._id);
    categoryResultIds.push(String(doc._id));
  }

  /** @type {string[]} */
  const productIds = [];

  for (const product of SEED_PRODUCTS) {
    const categorySlug = toSlug(product.category);
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown seed category: ${product.category}`);
    }

    const slug = toSlug(product.title);
    const doc = await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: product.title,
          slug,
          description: product.description,
          category: categoryId,
          brand: product.brand,
          price: product.price,
          discountPercent: product.discountPercent,
          stock: product.stock,
          images: [placeholderImage(product.title)],
          tags: product.tags,
          attributes: product.attributes,
          isActive: true,
        },
      },
      upsertOptions,
    );
    productIds.push(String(doc._id));
  }

  return {
    categories: categoryResultIds.length,
    products: productIds.length,
    categoryIds: categoryResultIds,
    productIds,
  };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  try {
    await connectDb();
    const result = await seedCatalog();
    logger.info(
      { categories: result.categories, products: result.products },
      'Catalog seed ready',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to seed catalog');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
