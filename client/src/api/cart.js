import { http } from './http.js';

export async function fetchCart() {
  const { data } = await http.get('/cart');
  return data.data;
}

export async function addCartItemRequest(productId, qty = 1) {
  const { data } = await http.post('/cart/items', { productId, qty });
  return data.data;
}

export async function updateCartItemRequest(productId, qty) {
  const { data } = await http.patch(`/cart/items/${encodeURIComponent(productId)}`, { qty });
  return data.data;
}

export async function removeCartItemRequest(productId) {
  const { data } = await http.delete(`/cart/items/${encodeURIComponent(productId)}`);
  return data.data;
}

export async function clearCartRequest() {
  const { data } = await http.delete('/cart');
  return data.data;
}

export async function placeOrderRequest(addressId) {
  const { data } = await http.post('/orders', { addressId });
  return data.data;
}
