import {
  addCartItem,
  clearCart,
  getPricedCart,
  removeCartItem,
  updateCartItem,
} from '../services/cartService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getPricedCart(req.user.id);
  res.json({ data: cart });
});

export const postCartItem = asyncHandler(async (req, res) => {
  const cart = await addCartItem(req.user.id, req.body);
  res.status(201).json({ data: cart });
});

export const patchCartItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItem(
    req.user.id,
    req.params.productId,
    req.body.qty,
  );
  res.json({ data: cart });
});

export const deleteCartItem = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.user.id, req.params.productId);
  res.json({ data: cart });
});

export const deleteCart = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.user.id);
  res.json({ data: cart });
});
