import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { requireServiceKey } from '../middleware/requireServiceKey.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const internalRouter = Router();

internalRouter.use(requireServiceKey);

internalRouter.get(
  '/products/export',
  asyncHandler(async (req, res) => {
    const requestedLimit = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
      : 50;

    const filter = { isActive: true };
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    if (cursor) {
      try {
        filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
      } catch {
        // Ignore malformed cursors and proceed with the first page.
      }
    }

    const docs = await Product.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .populate('category', 'name slug');

    const hasMore = docs.length > limit;
    const rows = docs.slice(0, limit).map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      category: product.category?.slug ?? null,
      categoryName: product.category?.name ?? null,
      brand: product.brand,
      price: product.price,
      stock: product.stock,
      tags: product.tags ?? [],
      attributes:
        product.attributes instanceof Map
          ? Object.fromEntries(product.attributes)
          : product.attributes ?? {},
      imageUrl: product.images?.[0]?.url ?? null,
      images: (product.images ?? []).map((image) => image.url),
      isActive: product.isActive,
    }));

    const cursorValue = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

    res.json({
      data: rows,
      limit,
      hasMore,
      cursor: cursorValue,
      nextCursor: cursorValue,
      meta: {
        limit,
        hasMore,
        cursor: cursorValue,
        nextCursor: cursorValue,
      },
    });
  }),
);

export default internalRouter;
