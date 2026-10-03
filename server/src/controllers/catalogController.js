import {
  getActiveProductBySlug,
  listActiveCategories,
  searchProducts,
} from '../services/catalogService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await listActiveCategories();
  res.json({ data: categories });
});

export const listProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await searchProducts(req.query);
  res.json({ data: products, meta });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await getActiveProductBySlug(req.params.slug);
  res.json({ data: product });
});
