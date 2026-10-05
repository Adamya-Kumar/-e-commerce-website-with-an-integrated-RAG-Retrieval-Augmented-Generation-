import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { onProductChanged } from '../src/services/productHooks.js';

const TEST_DB = 'spark-commerce-test';
const SERVICE_KEY = 'test-service-key';
const CHATBOT_URL = 'http://localhost:8001';

describe('P2-02 internal API', () => {
  beforeAll(async () => {
    process.env.SERVICE_KEY = SERVICE_KEY;
    process.env.CHATBOT_URL = CHATBOT_URL;
    await connectDb();
    if (mongoose.connection.name !== TEST_DB) {
      throw new Error(
        `Refusing to run internal API tests against ${mongoose.connection.name}`,
      );
    }
    await Promise.all([
      Category.deleteMany({ slug: /^internal-test-/ }),
      Product.deleteMany({ slug: /^internal-test-/ }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      Category.deleteMany({ slug: /^internal-test-/ }),
      Product.deleteMany({ slug: /^internal-test-/ }),
    ]);
    await mongoose.disconnect();
  });

  it('rejects requests without the service key and returns paginated export data with it', async () => {
    const category = await Category.create({
      name: 'Internal Test Category',
      slug: 'internal-test-category',
      isActive: true,
    });

    await Product.create({
      title: 'Internal Product One',
      slug: 'internal-test-product-one',
      description: 'alpha',
      category: category._id,
      brand: 'Internal Brand',
      price: 1900,
      stock: 12,
      tags: ['test'],
      attributes: { color: 'green', ram: '16GB' },
      isActive: true,
    });

    await Product.create({
      title: 'Internal Product Two',
      slug: 'internal-test-product-two',
      description: 'beta',
      category: category._id,
      brand: 'Internal Brand',
      price: 2800,
      stock: 4,
      tags: ['test'],
      attributes: { color: 'blue' },
      isActive: true,
    });

    const missingKey = await request(app).get('/api/internal/products/export');
    expect(missingKey.status).toBe(401);

    const exported = await request(app)
      .get('/api/internal/products/export?limit=1')
      .set('X-Service-Key', SERVICE_KEY);

    expect(exported.status).toBe(200);
    expect(exported.body.data.length).toBe(1);
    expect(exported.body.data[0].slug).toBe('internal-test-product-one');
    expect(exported.body.hasMore).toBe(true);
    expect(exported.body.nextCursor).toBeTruthy();
  });

  it('posts product updates to the chatbot without blocking the request', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const result = await onProductChanged({
      id: 'product-123',
      slug: 'internal-test-product-two',
      title: 'Internal Product Two',
    });

    expect(result).toBeUndefined();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${CHATBOT_URL}/ingest/product`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Service-Key': SERVICE_KEY,
          'Content-Type': 'application/json',
        }),
      }),
    );
  });
});
