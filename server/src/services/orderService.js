import {
  CANCELLABLE_STATUSES,
  RETURN_WINDOW_DAYS,
  shippingFeeForSubtotal,
} from '../config/commerce.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { unitPricePaise } from '../utils/pricing.js';

const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * @param {string} userId
 * @param {{ addressId: string }} input
 */
export async function placeOrder(userId, { addressId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized();
  }
  const address = user.addresses.id(addressId);
  if (!address) {
    throw ApiError.notFound('Address not found');
  }

  const taken = await Cart.findOneAndUpdate(
    { user: userId, 'items.0': { $exists: true } },
    { $set: { items: [] } },
    { returnDocument: 'before' },
  );
  if (!taken || taken.items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  const originalItems = taken.items.map((item) => ({
    product: item.product,
    qty: item.qty,
  }));
  /** @type {{ productId: import('mongoose').Types.ObjectId, qty: number, title: string }[]} */
  const decremented = [];

  try {
    const lines = await buildOrderLines(originalItems);
    for (const line of lines) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: line.productId,
          isActive: true,
          stock: { $gte: line.qty },
        },
        { $inc: { stock: -line.qty } },
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw await stockConflict(line);
      }
      decremented.push(line);
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const shippingFee = shippingFeeForSubtotal(subtotal);
    const order = await Order.create({
      user: userId,
      items: lines.map((line) => ({
        product: line.productId,
        title: line.title,
        image: line.image,
        unitPrice: line.unitPrice,
        qty: line.qty,
      })),
      shippingAddress: snapshotAddress(address),
      paymentMethod: 'COD',
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      status: 'placed',
      timeline: [
        {
          status: 'placed',
          at: new Date(),
          note: 'Order placed',
        },
      ],
    });
    return order.toJSON();
  } catch (err) {
    await restoreCheckout(userId, originalItems, decremented);
    throw err;
  }
}

/** @param {string} userId */
export async function listOrders(userId) {
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
  return orders.map((order) => order.toJSON());
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function getOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  return order.toJSON();
}

/**
 * @param {string} userId
 * @param {string} orderId
 * @param {{ reason?: string }} input
 */
export async function cancelOrder(userId, orderId, { reason } = {}) {
  const note = reason || 'Cancelled';
  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      user: userId,
      status: { $in: CANCELLABLE_STATUSES },
    },
    {
      $set: {
        status: 'cancelled',
        ...(reason ? { cancelReason: reason } : {}),
      },
      $push: {
        timeline: { status: 'cancelled', at: new Date(), note },
      },
    },
    { returnDocument: 'before' },
  );

  if (!claimed) {
    await assertOwnOrder(userId, orderId);
    throw ApiError.conflict('Order cannot be cancelled');
  }

  await restoreStock(claimed.items);
  const order = await Order.findById(orderId);
  return order.toJSON();
}

/**
 * @param {string} userId
 * @param {string} orderId
 * @param {{ reason: string }} input
 */
export async function requestReturn(userId, orderId, { reason }) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.status !== 'delivered') {
    throw ApiError.conflict('Order cannot be returned');
  }

  const deliveredAt = deliveredTimestamp(order);
  if (!deliveredAt) {
    throw ApiError.conflict('Order cannot be returned');
  }
  if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_MS) {
    throw ApiError.conflict('Return window has closed');
  }

  const requestedAt = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, user: userId, status: 'delivered' },
    {
      $set: {
        status: 'return_requested',
        returnRequest: { reason, requestedAt },
      },
      $push: {
        timeline: {
          status: 'return_requested',
          at: requestedAt,
          note: reason,
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw ApiError.conflict('Order cannot be returned');
  }
  return updated.toJSON();
}

/**
 * @param {{ product: import('mongoose').Types.ObjectId, qty: number }[]} items
 */
async function buildOrderLines(items) {
  const products = await Product.find({
    _id: { $in: items.map((item) => item.product) },
  });
  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );

  return items.map((item) => {
    const product = byId.get(String(item.product));
    const unitPrice = product
      ? unitPricePaise(product.price, product.discountPercent)
      : 0;
    return {
      productId: item.product,
      title: product?.title || 'Unknown product',
      image: product?.images?.[0]?.url || '',
      unitPrice,
      qty: item.qty,
      lineTotal: unitPrice * item.qty,
    };
  });
}

/**
 * @param {{ productId: unknown, qty: number, title: string }} line
 */
async function stockConflict(line) {
  const product = await Product.findById(line.productId);
  const unavailable = !product || !product.isActive;
  return ApiError.conflict(
    unavailable ? 'Product is unavailable' : 'Not enough stock',
    {
      product: {
        id: String(line.productId),
        title: product?.title || line.title,
        slug: product?.slug,
        stock: product?.stock ?? 0,
        requestedQty: line.qty,
      },
    },
  );
}

/**
 * @param {string} userId
 * @param {{ product: unknown, qty: number }[]} originalItems
 * @param {{ productId: unknown, qty: number }[]} decremented
 */
async function restoreCheckout(userId, originalItems, decremented) {
  try {
    await restoreStock(
      decremented.map((line) => ({
        product: line.productId,
        qty: line.qty,
      })),
    );
    await Cart.updateOne({ user: userId }, { $set: { items: originalItems } });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to restore cart after order error');
  }
}

/** @param {{ product: unknown, qty: number }[]} items */
async function restoreStock(items) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.qty } },
    );
  }
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
async function assertOwnOrder(userId, orderId) {
  const order = await Order.findById(orderId);
  if (!order || String(order.user) !== String(userId)) {
    throw ApiError.notFound('Order not found');
  }
}

/** @param {{ timeline: { status: string, at: Date }[] }} order */
function deliveredTimestamp(order) {
  const entry = [...order.timeline]
    .reverse()
    .find((item) => item.status === 'delivered');
  return entry?.at ? new Date(entry.at) : null;
}

/** @param {import('mongoose').Document} address */
function snapshotAddress(address) {
  return {
    label: address.label || '',
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: Boolean(address.isDefault),
  };
}
