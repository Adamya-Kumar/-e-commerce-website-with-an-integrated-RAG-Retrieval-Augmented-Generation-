import { http } from './http.js';

export async function fetchAddresses() {
  const { data } = await http.get('/addresses');
  return data.data;
}

export async function createAddressRequest(body) {
  const { data } = await http.post('/addresses', body);
  return data.data;
}
