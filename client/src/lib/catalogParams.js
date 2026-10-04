const SORTS = new Set(['relevance', 'price_asc', 'price_desc', 'newest']);

/** @param {string | null} value */
function readPaise(value) {
  if (!value || !/^\d+$/.test(value)) return '';
  return value;
}

/** @param {string | null} value */
function readPage(value) {
  const page = Number(value || '1');
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

/** @param {URLSearchParams} searchParams */
export function readCatalogParams(searchParams) {
  const sort = searchParams.get('sort') || 'newest';
  return {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: readPaise(searchParams.get('minPrice')),
    maxPrice: readPaise(searchParams.get('maxPrice')),
    inStock: searchParams.get('inStock') === 'true',
    sort: SORTS.has(sort) ? sort : 'newest',
    page: readPage(searchParams.get('page')),
  };
}

/**
 * Query string for the listing. Defaults stay off the URL.
 * @param {ReturnType<typeof readCatalogParams>} filters
 */
export function catalogSearchParams(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.minPrice !== '') params.set('minPrice', filters.minPrice);
  if (filters.maxPrice !== '') params.set('maxPrice', filters.maxPrice);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/**
 * @param {URLSearchParams} searchParams
 * @param {Partial<ReturnType<typeof readCatalogParams>>} patch
 * @param {{ resetPage?: boolean }} [options]
 */
export function patchCatalogSearch(searchParams, patch, options = {}) {
  const resetPage = options.resetPage !== false;
  const next = { ...readCatalogParams(searchParams), ...patch };
  if (resetPage && patch.page == null) next.page = 1;
  return catalogSearchParams(next);
}

/**
 * Params sent to GET /api/products. Prices stay integer paise.
 * @param {ReturnType<typeof readCatalogParams>} filters
 * @param {{ limit?: number }} [options]
 */
export function toProductQuery(filters, options = {}) {
  const params = {
    page: filters.page,
    limit: options.limit ?? 12,
    sort: filters.sort,
  };
  if (filters.q) params.q = filters.q;
  if (filters.category) params.category = filters.category;
  if (filters.brand) params.brand = filters.brand;
  if (filters.minPrice !== '') params.minPrice = Number(filters.minPrice);
  if (filters.maxPrice !== '') params.maxPrice = Number(filters.maxPrice);
  if (filters.inStock) params.inStock = true;
  return params;
}
