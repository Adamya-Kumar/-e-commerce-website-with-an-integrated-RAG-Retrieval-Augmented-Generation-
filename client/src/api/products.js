import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { http } from './http.js';

/** @param {Record<string, string | number | boolean>} [params] */
export async function fetchProducts(params) {
  const { data } = await http.get('/products', { params });
  return {
    products: data.data,
    meta: data.meta,
  };
}

export async function fetchCategories() {
  const { data } = await http.get('/categories');
  return data.data;
}

/** @param {string} slug */
export async function fetchProduct(slug) {
  const { data } = await http.get(`/products/${encodeURIComponent(slug)}`);
  return data.data;
}

export async function fetchBrands() {
  const brands = new Set();
  let page = 1;
  let totalPages = 1;
  do {
    const { products, meta } = await fetchProducts({ page, limit: 60, sort: 'newest' });
    products.forEach((product) => {
      if (product.brand) brands.add(product.brand);
    });
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return [...brands].sort((left, right) => left.localeCompare(right, 'en'));
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
}

/** @param {Record<string, string | number | boolean>} params */
export function useProducts(params) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
  });
}

/** @param {string | undefined} slug */
export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug),
    enabled: Boolean(slug),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['catalog-brands'],
    queryFn: fetchBrands,
    staleTime: 5 * 60 * 1000,
  });
}

/** @param {unknown} error */
export function isNotFoundError(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  return status === 404 || code === 'NOT_FOUND';
}
