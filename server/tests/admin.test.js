import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';

const uploadProductImage = jest.fn();
const deleteProductImage = jest.fn();
const onProductChanged = jest.fn();

jest.unstable_mockModule('../src/services/cloudinaryService.js', () => ({
  PRODUCT_IMAGE_FOLDER: 'spark-commerce/products',
  uploadProductImage,
  deleteProductImage,
}));

jest.unstable_mockModule('../src/services/productHooks.js', () => ({
  onProductChanged,
}));

const { default: app } = await import('../src/app.js');
const { AUTH_COOKIE_NAME } = await import('../src/config/auth.js');
const { connectDb } = await import('../src/config/db.js');
const { Category } = await import('../src/models/Category.js');
const { Order } = await import('../src/models/Order.js');
const { Product } = await import('../src/models/Product.js');
const { User } = await import('../src/models/User.js');
const { seedAdmin } = await import('../src/scripts/seedAdmin.js');

const TEST_DB = 'spark-commerce-test';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const SAMPLE_ID = '507f1f77bcf86cd799439011';

let adminCookie;

beforeAll(async () => {
  await connectDb();
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(
      `Refusing to run admin tests against ${mongoose.connection.name}`,
    );
  }
  await cleanup();
  adminCookie = await loginAdmin();
});

beforeEach(() => {
  uploadProductImage.mockReset();
  deleteProductImage.mockReset();
  onProductChanged.mockReset();
  uploadProductImage.mockResolvedValue({
    url: 'https://cdn.example/spark.png',
    publicId: 'spark-commerce/products/default',
  });
  deleteProductImage.mockResolvedValue(undefined);
  onProductChanged.mockResolvedValue(undefined);
});

afterAll(async () => {
  await cleanup();
  await mongoose.disconnect();
});

describe('admin API', () => {
  it('returns 403 for a customer on every admin route', async () => {
    const email = uniqueEmail('customer');
    const registered = await request(app).post('/api/auth/register').send({
      name: 'Admin Customer',
      email,
      password: 'password123',
    });
    expect(registered.status).toBe(201);
    const token = tokenFromCookie(registered);

    const routes = [
      ['get', '/api/admin/ping'],
      ['get', '/api/admin/stats'],
      ['get', '/api/admin/products'],
      ['post', '/api/admin/products'],
      ['get', `/api/admin/products/${SAMPLE_ID}`],
      ['patch', `/api/admin/products/${SAMPLE_ID}`],
      ['delete', `/api/admin/products/${SAMPLE_ID}`],
      ['get', '/api/admin/categories'],
      ['post', '/api/admin/categories'],
      ['get', `/api/admin/categories/${SAMPLE_ID}`],
      ['patch', `/api/admin/categories/${SAMPLE_ID}`],
      ['delete', `/api/admin/categories/${SAMPLE_ID}`],
      ['post', '/api/admin/uploads/image'],
      ['get', '/api/admin/orders'],
      ['get', `/api/admin/orders/${SAMPLE_ID}`],
      ['patch', `/api/admin/orders/${SAMPLE_ID}/status`],
    ];

    for (const [method, url] of routes) {
      const res = await request(app)
        [method](url)
        .set('Authorization', `Bearer ${token}`);
      expect({ method, url, status: res.status, body: res.body }).toMatchObject(
        {
          method,
          url,
          status: 403,
          body: { error: { code: 'FORBIDDEN' } },
        },
      );
    }
  });

  it('creates, updates, and deletes a product and its Cloudinary image', async () => {
    const stamp = suffix();
    const category = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', adminCookie)
      .send({ name: `Admin Audio ${stamp}` });
    expect(category.status).toBe(201);
    expect(category.body.data.slug).toBe(`admin-audio-${stamp}`);

    uploadProductImage.mockResolvedValue({
      url: 'https://cdn.example/lamp.png',
      publicId: 'spark-commerce/products/lamp',
    });

    const uploaded = await request(app)
      .post('/api/admin/uploads/image')
      .set('Cookie', adminCookie)
      .attach('image', PNG, { filename: 'lamp.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data).toEqual({
      url: 'https://cdn.example/lamp.png',
      publicId: 'spark-commerce/products/lamp',
    });
    expect(uploadProductImage).toHaveBeenCalledTimes(1);

    onProductChanged.mockRejectedValueOnce(new Error('ingest down'));
    const created = await request(app)
      .post('/api/admin/products')
      .set('Cookie', adminCookie)
      .send({
        title: `Admin Lamp ${stamp}`,
        description: 'A small lamp for the admin suite.',
        category: category.body.data.id,
        brand: 'Spark',
        price: 129900,
        discountPercent: 10,
        stock: 4,
        images: [
          uploaded.body.data,
          { url: 'https://placehold.co/600x400/png?text=Lamp' },
        ],
        tags: ['lamp'],
        attributes: { color: 'White' },
      });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe(`admin-lamp-${stamp}`);
    expect(created.body.data.images).toHaveLength(2);
    expect(created.body.data.attributes).toEqual({ color: 'White' });
    expect(onProductChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.body.data.id }),
    );

    const duplicate = await request(app)
      .post('/api/admin/products')
      .set('Cookie', adminCookie)
      .send({
        title: `Admin Lamp ${stamp}`,
        description: 'Duplicate',
        category: category.body.data.id,
        brand: 'Spark',
        price: 100,
        stock: 1,
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');

    const listed = await request(app)
      .get('/api/admin/products')
      .query({ q: `Admin Lamp ${stamp}` })
      .set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((product) => product.id)).toContain(
      created.body.data.id,
    );
    expect(listed.body.meta.total).toBeGreaterThan(0);

    const fetched = await request(app)
      .get(`/api/admin/products/${created.body.data.id}`)
      .set('Cookie', adminCookie);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.category.slug).toBe(`admin-audio-${stamp}`);

    const updated = await request(app)
      .patch(`/api/admin/products/${created.body.data.id}`)
      .set('Cookie', adminCookie)
      .send({
        isActive: false,
        images: [{ url: 'https://placehold.co/600x400/png?text=Lamp' }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.isActive).toBe(false);
    expect(deleteProductImage).toHaveBeenCalledWith(
      'spark-commerce/products/lamp',
    );

    const hidden = await request(app).get(
      `/api/products/${created.body.data.slug}`,
    );
    expect(hidden.status).toBe(404);

    const removed = await request(app)
      .delete(`/api/admin/products/${created.body.data.id}`)
      .set('Cookie', adminCookie);
    expect(removed.status).toBe(200);
    expect(deleteProductImage).toHaveBeenCalledTimes(1);

    const gone = await request(app)
      .get(`/api/admin/products/${created.body.data.id}`)
      .set('Cookie', adminCookie);
    expect(gone.status).toBe(404);

    const blocked = await request(app)
      .delete(`/api/admin/categories/${category.body.data.id}`)
      .set('Cookie', adminCookie);
    expect(blocked.status).toBe(200);
  });

  it('rejects images that are not jpeg, png, or webp, and files over 5 MB', async () => {
    const gif = await request(app)
      .post('/api/admin/uploads/image')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.from('GIF89a'), {
        filename: 'anim.gif',
        contentType: 'image/gif',
      });
    expect(gif.status).toBe(400);
    expect(gif.body.error.message).toMatch(/jpeg, png, and webp/);

    const jpeg = await request(app)
      .post('/api/admin/uploads/image')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.from('jpeg-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });
    expect(jpeg.status).toBe(201);

    const webp = await request(app)
      .post('/api/admin/uploads/image')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.from('webp-bytes'), {
        filename: 'photo.webp',
        contentType: 'image/webp',
      });
    expect(webp.status).toBe(201);

    const oversized = await request(app)
      .post('/api/admin/uploads/image')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.message).toMatch(/5 MB/);
    expect(uploadProductImage).toHaveBeenCalledTimes(2);
  });

  it('rejects illegal order status changes and restores stock on cancel', async () => {
    const stamp = suffix();
    const category = await Category.create({ name: `Admin Orders ${stamp}` });
    const product = await Product.create({
      title: `Admin Speaker ${stamp}`,
      description: 'Speaker used for status tests.',
      category: category._id,
      brand: 'Spark',
      price: 200000,
      stock: 5,
    });
    const customer = await User.create({
      name: 'Order Buyer',
      email: uniqueEmail('buyer'),
      passwordHash: 'hash',
      role: 'customer',
    });
    const order = await Order.create({
      user: customer._id,
      items: [
        {
          product: product._id,
          title: product.title,
          unitPrice: 200000,
          qty: 2,
        },
      ],
      shippingAddress: sampleAddress(),
      paymentMethod: 'COD',
      subtotal: 400000,
      shippingFee: 0,
      total: 400000,
      status: 'placed',
      timeline: [{ status: 'placed', at: new Date(), note: 'Order placed' }],
    });

    const skipped = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'shipped' });
    expect(skipped.status).toBe(409);
    expect(skipped.body.error.code).toBe('CONFLICT');
    expect(skipped.body.error.details).toMatchObject({
      from: 'placed',
      to: 'shipped',
    });

    const confirmed = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'confirmed', note: 'Payment expected' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');

    const backward = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'placed' });
    expect(backward.status).toBe(409);

    const cancelled = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'cancelled', note: 'Buyer changed their mind' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
    expect(cancelled.body.data.cancelReason).toBe('Buyer changed their mind');

    const afterCancel = await Product.findById(product._id);
    expect(afterCancel.stock).toBe(7);

    const terminal = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'confirmed' });
    expect(terminal.status).toBe(409);
    expect((await Product.findById(product._id)).stock).toBe(7);

    await Order.updateOne({ _id: order._id }, { status: 'returned' });
    const returned = await request(app)
      .patch(`/api/admin/orders/${order.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'delivered' });
    expect(returned.status).toBe(409);

    const listed = await request(app)
      .get('/api/admin/orders')
      .query({ status: 'returned' })
      .set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((item) => item.id)).toContain(order.id);
  });

  it('refuses to delete a category that still has products', async () => {
    const stamp = suffix();
    const category = await Category.create({ name: `Admin Home ${stamp}` });
    await Product.create({
      title: `Admin Pan ${stamp}`,
      description: 'Pan that keeps the category in use.',
      category: category._id,
      brand: 'Spark',
      price: 50000,
      stock: 3,
    });

    const blocked = await request(app)
      .delete(`/api/admin/categories/${category.id}`)
      .set('Cookie', adminCookie);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toMatch(/in use/);
  });

  it('reports revenue without cancelled or returned orders, and low stock', async () => {
    const before = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', adminCookie);
    expect(before.status).toBe(200);
    expect(before.body.data.revenueByDay).toHaveLength(14);

    const stamp = suffix();
    const category = await Category.create({ name: `Admin Stats ${stamp}` });
    const low = await Product.create({
      title: `Admin Low Stock ${stamp}`,
      description: 'Almost gone.',
      category: category._id,
      brand: 'Spark',
      price: 1000,
      stock: 5,
    });
    const healthy = await Product.create({
      title: `Admin Healthy Stock ${stamp}`,
      description: 'Plenty left.',
      category: category._id,
      brand: 'Spark',
      price: 1000,
      stock: 6,
    });
    const buyer = await User.create({
      name: 'Stats Buyer',
      email: uniqueEmail('stats'),
      passwordHash: 'hash',
      role: 'customer',
    });

    await saveOrder(buyer._id, low._id, {
      status: 'placed',
      total: 250000,
    });
    await saveOrder(buyer._id, low._id, {
      status: 'cancelled',
      total: 80000,
    });
    await saveOrder(buyer._id, low._id, {
      status: 'returned',
      total: 90000,
    });
    const older = await saveOrder(buyer._id, low._id, {
      status: 'placed',
      total: 110000,
    });
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Order.collection.updateOne(
      { _id: older._id },
      { $set: { createdAt: oldDate } },
    );

    const after = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', adminCookie);
    expect(after.status).toBe(200);
    expect(after.body.data.revenue - before.body.data.revenue).toBe(360000);
    expect(after.body.data.ordersCount - before.body.data.ordersCount).toBe(4);
    expect(after.body.data.newCustomers).toBeGreaterThanOrEqual(
      before.body.data.newCustomers,
    );

    const today = new Date().toISOString().slice(0, 10);
    const beforeToday = before.body.data.revenueByDay.find(
      (day) => day.date === today,
    );
    const afterToday = after.body.data.revenueByDay.find(
      (day) => day.date === today,
    );
    expect(afterToday.revenue - beforeToday.revenue).toBe(250000);
    expect(after.body.data.ordersByStatus.placed).toBe(
      before.body.data.ordersByStatus.placed + 2,
    );
    expect(after.body.data.ordersByStatus.cancelled).toBe(
      before.body.data.ordersByStatus.cancelled + 1,
    );
    expect(after.body.data.ordersByStatus.returned).toBe(
      before.body.data.ordersByStatus.returned + 1,
    );

    const lowIds = after.body.data.lowStock.map((product) => product.id);
    expect(lowIds).toContain(low.id);
    expect(lowIds).not.toContain(healthy.id);
  });
});

async function loginAdmin() {
  const email = uniqueEmail('root');
  const previousEmail = process.env.ADMIN_EMAIL;
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = email;
  process.env.ADMIN_PASSWORD = 'admin-password-123';
  try {
    await seedAdmin();
  } finally {
    process.env.ADMIN_EMAIL = previousEmail;
    process.env.ADMIN_PASSWORD = previousPassword;
  }
  const login = await request(app).post('/api/auth/login').send({
    email,
    password: 'admin-password-123',
  });
  if (login.status !== 200) {
    throw new Error(`Admin login failed: ${login.status}`);
  }
  return login.headers['set-cookie'];
}

async function saveOrder(userId, productId, { status, total }) {
  return Order.create({
    user: userId,
    items: [
      {
        product: productId,
        title: 'Stats item',
        unitPrice: total,
        qty: 1,
      },
    ],
    shippingAddress: sampleAddress(),
    paymentMethod: 'COD',
    subtotal: total,
    shippingFee: 0,
    total,
    status,
    timeline: [{ status, at: new Date(), note: status }],
  });
}

function sampleAddress() {
  return {
    fullName: 'Admin Buyer',
    phone: '9999999999',
    line1: '1 Test Lane',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
  };
}

async function cleanup() {
  const users = await User.find({ email: /@admin\.test$/ }).select('_id');
  const ids = users.map((user) => user._id);
  await Order.deleteMany({ user: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await Product.deleteMany({ slug: /^admin-/ });
  await Category.deleteMany({ slug: /^admin-/ });
}

function uniqueEmail(label) {
  return `${label}-${suffix()}@admin.test`;
}

function suffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function tokenFromCookie(res) {
  const raw = res.headers['set-cookie'];
  const header = Array.isArray(raw) ? raw.join(';') : String(raw ?? '');
  const match = header.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  if (!match) {
    throw new Error('Auth cookie was not set');
  }
  return match[1];
}
