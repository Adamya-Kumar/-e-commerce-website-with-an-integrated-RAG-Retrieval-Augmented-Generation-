import { shippingFeeForSubtotal } from '../config/commerce.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { unitPricePaise } from '../utils/pricing.js';

/**
 * @param {string} userId
 */
export async function getOrCreateCart(userId) {
  const existing = await Cart.findOne({ user: userId });
  if (existing) {
    return existing;
  }
  try {
    return await Cart.create({ user: userId, items: [] });
  } catch (err) {
    if (isDuplicateKey(err)) {
      return Cart.findOne({ user: userId });
    }
    throw err;
  }
}

/**
 * Live catalog prices. Stored cart rows keep only product and qty.
 * @param {string} userId
 */
export async function getPricedCart(userId) {
  const cart = await getOrCreateCart(userId);
  return priceCart(cart);
}

/**
 * @param {string} userId
 * @param {{ productId: string, qty: number }} input
 */
export async function addCartItem(userId, { productId, qty }) {
  const product = await findActiveProduct(productId);
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.product.equals(productId));
  const nextQty = (existing?.qty || 0) + qty;
  assertQtyWithinStock(product, nextQty);

  if (existing) {
    existing.qty = nextQty;
  } else {
    cart.items.push({ product: productId, qty });
  }
  await cart.save();
  return priceCart(cart);
}

/**
 * @param {string} userId
 * @param {string} productId
 * @param {number} qty
 */
export async function updateCartItem(userId, productId, qty) {
  const product = await findActiveProduct(productId);
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.product.equals(productId));
  if (!existing) {
    throw ApiError.notFound('Cart item not found');
  }
  assertQtyWithinStock(product, qty);
  existing.qty = qty;
  await cart.save();
  return priceCart(cart);
}

/**
 * @param {string} userId
 * @param {string} productId
 */
export async function removeCartItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  const before = cart.items.length;
  cart.items = cart.items.filter((item) => !item.product.equals(productId));
  if (cart.items.length === before) {
    throw ApiError.notFound('Cart item not found');
  }
  await cart.save();
  return priceCart(cart);
}

/** @param {string} userId */
export async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();
  return priceCart(cart);
}

/** @param {import('mongoose').Document} cart */
async function priceCart(cart) {
  const ids = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const items = [];
  for (const line of cart.items) {
    const product = byId.get(String(line.product));
    if (!product) {
      continue;
    }
    const unitPrice = unitPricePaise(product.price, product.discountPercent);
    items.push({
      productId: String(product._id),
      title: product.title,
      slug: product.slug,
      image: product.images[0]?.url || '',
      qty: line.qty,
      stock: product.stock,
      unitPrice,
      lineTotal: unitPrice * line.qty,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = items.length === 0 ? 0 : shippingFeeForSubtotal(subtotal);
  return {
    id: cart.id,
    items,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}

/** @param {string} productId */
async function findActiveProduct(productId) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

/**
 * @param {{ title: string, id?: string, _id?: unknown, stock: number, slug?: string }} product
 * @param {number} qty
 */
function assertQtyWithinStock(product, qty) {
  if (qty > product.stock) {
    throw ApiError.conflict('Quantity exceeds available stock', {
      product: {
        id: product.id || String(product._id),
        title: product.title,
        slug: product.slug,
        stock: product.stock,
        requestedQty: qty,
      },
    });
  }
}

/** @param {unknown} err */
function isDuplicateKey(err) {
  return Boolean(err && typeof err === 'object' && err.code === 11000);
}
