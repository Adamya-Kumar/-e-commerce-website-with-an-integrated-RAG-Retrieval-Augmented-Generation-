import {
  cancelOrder,
  getOrder,
  listOrders,
  placeOrder,
  requestReturn,
} from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const postOrder = asyncHandler(async (req, res) => {
  const order = await placeOrder(req.user.id, req.body);
  res.status(201).json({ data: order });
});

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await listOrders(req.user.id);
  res.json({ data: orders });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await getOrder(req.user.id, req.params.id);
  res.json({ data: order });
});

export const postCancelOrder = asyncHandler(async (req, res) => {
  const order = await cancelOrder(req.user.id, req.params.id, req.body);
  res.json({ data: order });
});

export const postReturnOrder = asyncHandler(async (req, res) => {
  const order = await requestReturn(req.user.id, req.params.id, req.body);
  res.json({ data: order });
});
