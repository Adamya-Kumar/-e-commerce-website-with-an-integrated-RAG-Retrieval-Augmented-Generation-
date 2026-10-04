import { http } from './http.js';

export async function fetchAddresses() {
  const { data } = await http.get('/addresses');
  return data.data;
}

export async function createAddressRequest(body) {
  const { data } = await http.post('/addresses', body);
  return data.data;
}

export async function updateAddressRequest(addressId, body) {
  const { data } = await http.put(`/addresses/${encodeURIComponent(addressId)}`, body);
  return data.data;
}

export async function deleteAddressRequest(addressId) {
  const { data } = await http.delete(`/addresses/${encodeURIComponent(addressId)}`);
  return data.data;
}
