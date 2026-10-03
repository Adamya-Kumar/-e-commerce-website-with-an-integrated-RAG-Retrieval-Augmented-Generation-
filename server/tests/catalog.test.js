import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { SEED_PRODUCTS } from '../src/scripts/catalogSeedData.js';
import { seedCatalog } from '../src/scripts/seedCatalog.js';
import { toSlug } from '../src/utils/slug.js';

const TEST_DB = 'spark-commerce-test';

beforeAll(async () => {
  await connectDb();
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(
      `Refusing to run catalog tests against ${mongoose.connection.name}`,
    );
  }
  await Product.deleteMany({});
  await Category.deleteMany({});
});

afterAll(async () => {
  await Product.deleteMany({});
  await Category.deleteMany({});
  await mongoose.disconnect();
});

describe('catalog API', () => {
  it('seeds an idempotent catalog and serves active categories', async () => {
    const first = await seedCatalog();
    const second = await seedCatalog();

    expect(first).toMatchObject({ categories: 6, products: 60 });
    expect(second).toMatchObject({ categories: 6, products: 60 });
    expect(second.categoryIds).toEqual(first.categoryIds);
    expect(second.productIds).toEqual(first.productIds);
    expect(await Category.countDocuments()).toBe(6);
    expect(await Product.countDocuments()).toBe(60);

    const listed = await request(app).get('/api/categories');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(6);
    expect(listed.body.data.map((category) => category.slug)).toEqual([
      'audio',
      'home-and-kitchen',
      'laptops',
      'mens-fashion',
      'mobiles',
      'womens-fashion',
    ]);
    expect(listed.body.data.every((category) => category.isActive)).toBe(true);
  });

  it('filters and sorts products and returns meta', async () => {
    const expected = SEED_PRODUCTS.filter(
      (product) => product.category === 'Laptops' && product.price <= 6000000,
    )
      .slice()
      .sort((a, b) => a.price - b.price)
      .map((product) => toSlug(product.title));

    const res = await request(app).get('/api/products').query({
      q: 'laptop',
      maxPrice: 6000000,
      sort: 'price_asc',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.map((product) => product.slug)).toEqual(expected);
    expect(res.body.data.every((product) => product.price <= 6000000)).toBe(
      true,
    );
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 12,
      total: expected.length,
      totalPages: 1,
    });
    expect(res.body.data[0].category).toMatchObject({
      slug: 'laptops',
      name: 'Laptops',
    });
    expect(res.body.data[0].passwordHash).toBeUndefined();

    const byRelevance = await request(app).get('/api/products').query({
      q: 'laptop',
      sort: 'relevance',
      limit: 60,
    });
    expect(byRelevance.status).toBe(200);
    expect(byRelevance.body.meta.total).toBe(10);
    expect(
      byRelevance.body.data.every(
        (product) => product.category.slug === 'laptops',
      ),
    ).toBe(true);
  });

  it('returns the 404 envelope for an unknown or inactive slug', async () => {
    const missing = await request(app).get('/api/products/missing-product');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Product not found',
      },
    });

    const laptops = await Category.findOne({ slug: 'laptops' });
    await Product.create({
      title: 'Hidden Laptop',
      description: 'Inactive catalog row used by tests.',
      category: laptops._id,
      brand: 'Test',
      price: 100000,
      stock: 3,
      tags: ['laptop'],
      isActive: false,
      images: [{ url: 'https://placehold.co/800x800/png?text=Hidden' }],
    });

    const hidden = await request(app).get('/api/products/hidden-laptop');
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe('NOT_FOUND');

    const search = await request(app).get('/api/products').query({
      q: 'laptop',
      maxPrice: 6000000,
      sort: 'price_asc',
    });
    expect(
      search.body.data.some((product) => product.slug === 'hidden-laptop'),
    ).toBe(false);
  });

  it('filters by category, brand, and stock', async () => {
    const audio = await request(app).get('/api/products').query({
      category: 'audio',
      limit: 60,
    });
    expect(audio.status).toBe(200);
    expect(audio.body.meta.total).toBe(10);
    expect(
      audio.body.data.every((product) => product.category.slug === 'audio'),
    ).toBe(true);

    const brand = await request(app)
      .get('/api/products')
      .query({ brand: 'dell', limit: 60 });
    expect(brand.body.data.map((product) => product.slug)).toEqual([
      'dell-inspiron-15-laptop',
    ]);

    const outOfStock = await request(app).get('/api/products').query({
      inStock: 'false',
      limit: 60,
    });
    expect(outOfStock.body.data.map((product) => product.slug)).toEqual([
      'realme-narzo-70',
    ]);

    const unknownCategory = await request(app).get('/api/products').query({
      category: 'not-a-category',
    });
    expect(unknownCategory.status).toBe(200);
    expect(unknownCategory.body.data).toEqual([]);
    expect(unknownCategory.body.meta.total).toBe(0);
  });

  it('rejects an invalid sort value', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ sort: 'cheapest' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
