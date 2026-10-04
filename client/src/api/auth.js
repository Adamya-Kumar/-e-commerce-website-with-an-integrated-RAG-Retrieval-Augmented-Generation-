import { http } from './http.js';

/** @param {{ email: string, password: string }} body */
export async function loginRequest(body) {
  const { data } = await http.post('/auth/login', body);
  return data.data;
}

/** @param {{ name: string, email: string, password: string }} body */
export async function registerRequest(body) {
  const { data } = await http.post('/auth/register', body);
  return data.data;
}

export async function logoutRequest() {
  const { data } = await http.post('/auth/logout');
  return data.data;
}

export async function meRequest() {
  const { data } = await http.get('/auth/me');
  return data.data;
}
