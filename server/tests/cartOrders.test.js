import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import {
  RETURN_WINDOW_DAYS,
  SHIPPING_FEE_PAISE,
} from '../src/config/commerce.js';
import { connectDb } from '../src/config/db.js';
import { Cart } from '../src/models/Cart.js';
import { Category } from '../src/models/Category.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { unitPricePaise } from '../src/utils/pricing.js';

const TEST_DB = 'spark-commerce-test';
const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await connectDb();
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(
      `Refusing to run cart tests against ${mongoose.connection.name}`,
    );
  }
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await mongoose.disconnect();
});

describe('cart and order API', () => {
  it('prices the cart from the catalog and rejects bad quantities', async () => {
    const { agent } = await registerCustomer('cart');
    const product = await createProduct({
      title: 'Live Price Headphones',
      price: 200000,
      discountPercent: 10,
      stock: 3,
    });
    const payable = unitPricePaise(200000, 10);

    const added = await agent.post('/api/cart/items').send({
      productId: product.id,
      qty: 2,
      unitPrice: 1,
      lineTotal: 1,
    });
    expect(added.status).toBe(201);
    expect(added.body.data.items).toEqual([
      expect.objectContaining({
        productId: product.id,
        qty: 2,
        unitPrice: payable,
        lineTotal: payable * 2,
      }),
    ]);
    expect(added.body.data.subtotal).toBe(payable * 2);
    expect(added.body.data.shippingFee).toBe(0);
    expect(added.body.data.total).toBe(payable * 2);

    await Product.updateOne({ _id: product.id }, { price: 250000 });
    const live = await agent.get('/api/cart');
    const nextPayable = unitPricePaise(250000, 10);
    expect(live.status).toBe(200);
    expect(live.body.data.items[0].unitPrice).toBe(nextPayable);
    expect(live.body.data.items[0].lineTotal).toBe(nextPayable * 2);
    expect(live.body.data.total).toBe(nextPayable * 2);

    const tooLow = await agent.post('/api/cart/items').send({
      productId: product.id,
      qty: 0,
    });
    expect(tooLow.status).toBe(422);
    expect(tooLow.body.error.code).toBe('VALIDATION_ERROR');

    const tooMany = await agent.patch(`/api/cart/items/${product.id}`).send({
      qty: 4,
    });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe('CONFLICT');
    expect(tooMany.body.error.details.product).toMatchObject({
      id: product.id,
      stock: 3,
      requestedQty: 4,
    });

    const guest = await request(app).get('/api/cart');
    expect(guest.status).toBe(401);
    expect(guest.body.error.code).toBe('UNAUTHORIZED');
  });

  it('ignores client prices and stores server totals', async () => {
    const { agent } = await registerCustomer('totals');
    const paid = await createProduct({
      title: 'Paid Shipping Mug',
      price: 49950,
      discountPercent: 0,
      stock: 5,
    });
    const free = await createProduct({
      title: 'Free Shipping Kettle',
      price: 100000,
      discountPercent: 0,
      stock: 5,
    });
    const address = await addAddress(agent);

    await agent.post('/api/cart/items').send({ productId: paid.id, qty: 2 });
    const charged = await agent.post('/api/orders').send({
      addressId: address.id,
      subtotal: 1,
      shippingFee: 1,
      total: 1,
      items: [{ unitPrice: 1, qty: 2 }],
    });
    expect(charged.status).toBe(201);
    expect(charged.body.data.paymentMethod).toBe('COD');
    expect(charged.body.data.status).toBe('placed');
    expect(charged.body.data.timeline[0].status).toBe('placed');
    expect(charged.body.data.items[0]).toMatchObject({
      product: paid.id,
      unitPrice: 49950,
      qty: 2,
    });
    expect(charged.body.data.subtotal).toBe(99900);
    expect(charged.body.data.shippingFee).toBe(SHIPPING_FEE_PAISE);
    expect(charged.body.data.total).toBe(99900 + SHIPPING_FEE_PAISE);
    expect(charged.body.data.shippingAddress.fullName).toBe('Ada Lovelace');

    const emptied = await agent.get('/api/cart');
    expect(emptied.body.data.items).toEqual([]);
    expect(emptied.body.data.total).toBe(0);

    await agent.post('/api/cart/items').send({ productId: free.id, qty: 1 });
    const waived = await agent.post('/api/orders').send({
      addressId: address.id,
      total: 1,
    });
    expect(waived.status).toBe(201);
    expect(waived.body.data.subtotal).toBe(100000);
    expect(waived.body.data.shippingFee).toBe(0);
    expect(waived.body.data.total).toBe(100000);
  });

  it('lets only one of two concurrent orders take the last unit', async () => {
    const first = await registerCustomer('race-a');
    const second = await registerCustomer('race-b');
    const product = await createProduct({
      title: 'Last Unit Speaker',
      price: 150000,
      discountPercent: 0,
      stock: 1,
    });
    const addressA = await addAddress(first.agent);
    const addressB = await addAddress(second.agent);
    await first.agent
      .post('/api/cart/items')
      .send({ productId: product.id, qty: 1 })
      .expect(201);
    await second.agent
      .post('/api/cart/items')
      .send({ productId: product.id, qty: 1 })
      .expect(201);

    const [left, right] = await Promise.all([
      first.agent.post('/api/orders').send({
        addressId: addressA.id,
        total: 1,
        unitPrice: 1,
      }),
      second.agent.post('/api/orders').send({
        addressId: addressB.id,
        total: 1,
        unitPrice: 1,
      }),
    ]);

    const responses = [left, right];
    const won = responses.find((res) => res.status === 201);
    const lost = responses.find((res) => res.status === 409);
    expect(won).toBeTruthy();
    expect(lost).toBeTruthy();
    expect(won.body.data.subtotal).toBe(150000);
    expect(won.body.data.shippingFee).toBe(0);
    expect(won.body.data.total).toBe(150000);
    expect(won.body.data.items[0].unitPrice).toBe(150000);
    expect(lost.body.error.code).toBe('CONFLICT');
    expect(lost.body.error.details.product).toMatchObject({
      id: product.id,
      requestedQty: 1,
    });

    const saved = await Product.findById(product.id);
    expect(saved.stock).toBe(0);
    expect(await Order.countDocuments({ 'items.product': product.id })).toBe(1);

    const winnerCart =
      won === left
        ? await first.agent.get('/api/cart')
        : await second.agent.get('/api/cart');
    const loserCart =
      won === left
        ? await second.agent.get('/api/cart')
        : await first.agent.get('/api/cart');
    expect(winnerCart.body.data.items).toEqual([]);
    expect(loserCart.body.data.items).toHaveLength(1);
  });

  it('restores stock on cancel and rejects cancel after shipped', async () => {
    const { agent } = await registerCustomer('cancel');
    const product = await createProduct({
      title: 'Cancelable Lamp',
      price: 80000,
      discountPercent: 0,
      stock: 4,
    });
    const address = await addAddress(agent);
    await agent.post('/api/cart/items').send({ productId: product.id, qty: 2 });
    const placed = await agent
      .post('/api/orders')
      .send({ addressId: address.id });
    expect(placed.status).toBe(201);
    expect((await Product.findById(product.id)).stock).toBe(2);

    const cancelled = await agent
      .post(`/api/orders/${placed.body.data.id}/cancel`)
      .send({ reason: 'Changed my mind' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
    expect(cancelled.body.data.cancelReason).toBe('Changed my mind');
    expect(cancelled.body.data.timeline.map((entry) => entry.status)).toEqual([
      'placed',
      'cancelled',
    ]);
    expect((await Product.findById(product.id)).stock).toBe(4);

    const again = await agent
      .post(`/api/orders/${placed.body.data.id}/cancel`)
      .send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('CONFLICT');
    expect((await Product.findById(product.id)).stock).toBe(4);

    await agent.post('/api/cart/items').send({ productId: product.id, qty: 1 });
    const shippedOrder = await agent
      .post('/api/orders')
      .send({ addressId: address.id });
    expect(shippedOrder.status).toBe(201);
    await Order.updateOne(
      { _id: shippedOrder.body.data.id },
      { $set: { status: 'shipped' } },
    );
    const stockAfterShip = (await Product.findById(product.id)).stock;

    const blocked = await agent
      .post(`/api/orders/${shippedOrder.body.data.id}/cancel`)
      .send({ reason: 'Too late' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toBe('Order cannot be cancelled');
    expect((await Product.findById(product.id)).stock).toBe(stockAfterShip);
  });

  it('hides another customer order and enforces the return window', async () => {
    const owner = await registerCustomer('owner');
    const other = await registerCustomer('other');
    const product = await createProduct({
      title: 'Returnable Bottle',
      price: 120000,
      discountPercent: 0,
      stock: 2,
    });
    const address = await addAddress(owner.agent);
    await owner.agent
      .post('/api/cart/items')
      .send({ productId: product.id, qty: 1 });
    const placed = await owner.agent
      .post('/api/orders')
      .send({ addressId: address.id });
    const orderId = placed.body.data.id;
    expect(placed.status).toBe(201);

    const hidden = await other.agent.get(`/api/orders/${orderId}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
    const hiddenCancel = await other.agent
      .post(`/api/orders/${orderId}/cancel`)
      .send({ reason: 'Not mine' });
    expect(hiddenCancel.status).toBe(404);

    const list = await other.agent.get('/api/orders');
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);

    const ownList = await owner.agent.get('/api/orders');
    expect(ownList.body.data.map((order) => order.id)).toContain(orderId);

    const tooSoon = await owner.agent
      .post(`/api/orders/${orderId}/return`)
      .send({ reason: 'Not delivered' });
    expect(tooSoon.status).toBe(409);

    await Order.updateOne(
      { _id: orderId },
      {
        $set: { status: 'delivered' },
        $push: {
          timeline: {
            status: 'delivered',
            at: new Date(Date.now() - (RETURN_WINDOW_DAYS + 1) * DAY_MS),
            note: 'Delivered',
          },
        },
      },
    );
    const expired = await owner.agent
      .post(`/api/orders/${orderId}/return`)
      .send({ reason: 'Too late' });
    expect(expired.status).toBe(409);
    expect(expired.body.error.message).toBe('Return window has closed');

    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'delivered',
          'timeline.$[entry].at': new Date(Date.now() - DAY_MS),
        },
      },
      { arrayFilters: [{ 'entry.status': 'delivered' }] },
    );
    const stockBefore = (await Product.findById(product.id)).stock;
    const returned = await owner.agent
      .post(`/api/orders/${orderId}/return`)
      .send({ reason: 'Wrong size' });
    expect(returned.status).toBe(200);
    expect(returned.body.data.status).toBe('return_requested');
    expect(returned.body.data.returnRequest.reason).toBe('Wrong size');
    expect((await Product.findById(product.id)).stock).toBe(stockBefore);
  });

  it('keeps a default address in the embedded address book', async () => {
    const { agent } = await registerCustomer('address');
    const first = await addAddress(agent, { label: 'Home' });
    expect(first.isDefault).toBe(true);

    const second = await agent.post('/api/addresses').send({
      ...addressInput(),
      label: 'Office',
      isDefault: true,
    });
    expect(second.status).toBe(201);
    expect(second.body.data.isDefault).toBe(true);

    const listed = await agent.get('/api/addresses');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(2);
    expect(
      listed.body.data.find((item) => item.id === first.id).isDefault,
    ).toBe(false);

    const renamed = await agent.put(`/api/addresses/${first.id}`).send({
      ...addressInput(),
      label: 'Home updated',
      fullName: 'Ada Lovelace',
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.label).toBe('Home updated');
    expect(renamed.body.data.isDefault).toBe(false);

    const removed = await agent.delete(`/api/addresses/${second.body.data.id}`);
    expect(removed.status).toBe(200);
    const after = await agent.get('/api/addresses');
    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].isDefault).toBe(true);
  });
});

async function registerCustomer(label) {
  const agent = request.agent(app);
  const email = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@cart.test`;
  const res = await agent.post('/api/auth/register').send({
    name: label,
    email,
    password: 'password123',
  });
  expect(res.status).toBe(201);
  return { agent, email, userId: res.body.data.id };
}

async function createProduct({ title, price, discountPercent, stock }) {
  const category = await Category.findOneAndUpdate(
    { slug: 'cart-order-test' },
    { name: 'Cart Order Test', slug: 'cart-order-test', isActive: true },
    { upsert: true, returnDocument: 'after' },
  );
  const slug = `cart-order-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return Product.create({
    title,
    slug,
    description: `${title} used by cart and order tests.`,
    category: category._id,
    brand: 'Test',
    price,
    discountPercent,
    stock,
    images: [
      { url: 'https://placehold.co/600x400/png?text=Cart', publicId: '' },
    ],
    tags: ['cart-test'],
    isActive: true,
  });
}

function addressInput(overrides = {}) {
  return {
    label: 'Home',
    fullName: 'Ada Lovelace',
    phone: '9876543210',
    line1: '12 Analytical Engine Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    ...overrides,
  };
}

async function addAddress(agent, overrides = {}) {
  const res = await agent.post('/api/addresses').send(addressInput(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

async function cleanup() {
  const users = await User.find({ email: /@cart\.test$/ }).select('_id');
  const ids = users.map((user) => user._id);
  await Cart.deleteMany({ user: { $in: ids } });
  await Order.deleteMany({ user: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await Product.deleteMany({ slug: /^cart-order-/ });
  await Category.deleteMany({ slug: 'cart-order-test' });
}
