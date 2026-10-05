import { http } from './http.js';

export async function fetchAdminStats() {
  const { data } = await http.get('/admin/stats');
  return data.data;
}

export async function fetchAdminProducts(params) {
  const { data } = await http.get('/admin/products', { params });
  return { products: data.data, meta: data.meta };
}

export async function createAdminProduct(body) {
  const { data } = await http.post('/admin/products', body);
  return data.data;
}

export async function updateAdminProduct(productId, body) {
  const { data } = await http.patch(`/admin/products/${encodeURIComponent(productId)}`, body);
  return data.data;
}

export async function deleteAdminProduct(productId) {
  const { data } = await http.delete(`/admin/products/${encodeURIComponent(productId)}`);
  return data.data;
}

export async function uploadAdminProductImage(file) {
  const body = new FormData();
  body.append('image', file);
  const { data } = await http.post('/admin/uploads/image', body);
  return data.data;
}

export async function fetchAdminCategories() {
  const { data } = await http.get('/admin/categories');
  return data.data;
}

export async function createAdminCategory(body) {
  const { data } = await http.post('/admin/categories', body);
  return data.data;
}

export async function updateAdminCategory(categoryId, body) {
  const { data } = await http.patch(`/admin/categories/${encodeURIComponent(categoryId)}`, body);
  return data.data;
}

export async function deleteAdminCategory(categoryId) {
  const { data } = await http.delete(`/admin/categories/${encodeURIComponent(categoryId)}`);
  return data.data;
}

export async function fetchAdminOrders(params) {
  const { data } = await http.get('/admin/orders', { params });
  return { orders: data.data, meta: data.meta };
}

export async function fetchAdminOrder(orderId) {
  const { data } = await http.get(`/admin/orders/${encodeURIComponent(orderId)}`);
  return data.data;
}

export async function updateAdminOrderStatus(orderId, body) {
  const { data } = await http.patch(`/admin/orders/${encodeURIComponent(orderId)}/status`, body);
  return data.data;
}