import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../services/adminCategoryService.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../services/adminProductService.js';
import { getAdminStats } from '../services/adminStatsService.js';
import { uploadProductImage as storeProductImage } from '../services/cloudinaryService.js';
import {
  getAdminOrder,
  listAdminOrders,
  updateOrderStatus,
} from '../services/orderService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await getAdminStats();
  res.json({ data: stats });
});

export const postProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Image file is required');
  }
  const image = await storeProductImage(req.file.buffer);
  res.status(201).json({ data: image });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await listProducts(req.query);
  res.json({ data: products, meta });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await getProduct(req.params.id);
  res.json({ data: product });
});

export const postProduct = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);
  res.status(201).json({ data: product });
});

export const patchProduct = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.id, req.body);
  res.json({ data: product });
});

export const removeProduct = asyncHandler(async (req, res) => {
  const product = await deleteProduct(req.params.id);
  res.json({ data: product });
});

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await listCategories();
  res.json({ data: categories });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await getCategory(req.params.id);
  res.json({ data: category });
});

export const postCategory = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body);
  res.status(201).json({ data: category });
});

export const patchCategory = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id, req.body);
  res.json({ data: category });
});

export const removeCategory = asyncHandler(async (req, res) => {
  const category = await deleteCategory(req.params.id);
  res.json({ data: category });
});

export const getOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await listAdminOrders(req.query);
  res.json({ data: orders, meta });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await getAdminOrder(req.params.id);
  res.json({ data: order });
});

export const patchOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(req.params.id, req.body);
  res.json({ data: order });
});
