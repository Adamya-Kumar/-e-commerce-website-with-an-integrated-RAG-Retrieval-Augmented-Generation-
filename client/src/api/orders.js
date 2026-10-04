import { http } from './http.js';

export async function fetchOrders() {
  const { data } = await http.get('/orders');
  return data.data;
}

export async function fetchOrder(orderId) {
  const { data } = await http.get(`/orders/${encodeURIComponent(orderId)}`);
  return data.data;
}

export async function cancelOrderRequest(orderId, reason = '') {
  const { data } = await http.post(`/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
  return data.data;
}

export async function returnOrderRequest(orderId, reason) {
  const { data } = await http.post(`/orders/${encodeURIComponent(orderId)}/return`, { reason });
  return data.data;
}
