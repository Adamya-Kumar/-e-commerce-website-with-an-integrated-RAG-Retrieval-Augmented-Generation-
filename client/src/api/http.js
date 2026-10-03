import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

/** @param {unknown} error */
export function apiErrorMessage(error) {
  const body = error?.response?.data?.error;
  if (Array.isArray(body?.details) && body.details.length > 0) {
    const messages = body.details
      .map((item) => (item && typeof item.message === 'string' ? item.message : ''))
      .filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  if (typeof body?.message === 'string' && body.message) return body.message;
  return 'Something went wrong. Please try again.';
}
