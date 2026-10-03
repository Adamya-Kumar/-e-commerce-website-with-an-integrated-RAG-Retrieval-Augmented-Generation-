import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

export async function listCategories() {
  const categories = await Category.find().sort({ name: 1, _id: 1 });
  return categories.map((category) => category.toJSON());
}

/** @param {string} id */
export async function getCategory(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return category.toJSON();
}

/**
 * @param {{ name: string, slug?: string, image?: string, isActive?: boolean }} input
 */
export async function createCategory(input) {
  try {
    const category = await Category.create(input);
    return category.toJSON();
  } catch (err) {
    throw mapDuplicate(err, 'A category with that slug already exists');
  }
}

/**
 * @param {string} id
 * @param {{ name?: string, slug?: string, image?: string, isActive?: boolean }} input
 */
export async function updateCategory(id, input) {
  const category = await Category.findById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  Object.assign(category, input);
  try {
    await category.save();
  } catch (err) {
    throw mapDuplicate(err, 'A category with that slug already exists');
  }
  return category.toJSON();
}

/** @param {string} id */
export async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  const inUse = await Product.exists({ category: category._id });
  if (inUse) {
    throw ApiError.conflict('Category is in use by a product');
  }
  await category.deleteOne();
  return category.toJSON();
}

/**
 * @param {unknown} err
 * @param {string} message
 */
function mapDuplicate(err, message) {
  if (err && typeof err === 'object' && err.code === 11000) {
    return ApiError.conflict(message);
  }
  return err;
}
