import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBrands, useCategories, useProducts } from '../../api/products.js';
import { apiErrorMessage } from '../../api/http.js';
import CatalogEmpty from '../../components/shop/CatalogEmpty.jsx';
import CatalogError from '../../components/shop/CatalogError.jsx';
import CategoryChips from '../../components/shop/CategoryChips.jsx';
import FilterPanel from '../../components/shop/FilterPanel.jsx';
import ListingSkeleton from '../../components/shop/ListingSkeleton.jsx';
import ProductCard from '../../components/shop/ProductCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Drawer from '../../components/ui/Drawer.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { patchCatalogSearch, readCatalogParams, toProductQuery } from '../../lib/catalogParams.js';
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const desktop = useMediaQuery('(min-width: 992px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = readCatalogParams(params);
  const categories = useCategories();
  const brandsQuery = useBrands();
  const productsQuery = useProducts(toProductQuery(filters));
  const products = productsQuery.data?.products ?? [];
  const meta = productsQuery.data?.meta;
  const categoryOptions = categories.data ?? [];

  const brands = useMemo(() => {
    const names = new Set(brandsQuery.data ?? []);
    if (filters.brand) names.add(filters.brand);
    return [...names].sort((left, right) => left.localeCompare(right, 'en'));
  }, [brandsQuery.data, filters.brand]);

  function updateFilters(partial) {
    setParams(patchCatalogSearch(params, partial));
  }

  function clearFilters() {
    setParams(new URLSearchParams());
    setFiltersOpen(false);
  }

  function changePage(page) {
    setParams(patchCatalogSearch(params, { page }, { resetPage: false }));
  }

  let listing = null;
  if (productsQuery.isLoading) {
    listing = (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading products</span>
        <ListingSkeleton />
      </div>
    );
  } else if (productsQuery.isError) {
    listing = (
      <CatalogError
        title="Couldn't load products"
        description={apiErrorMessage(productsQuery.error)}
        onRetry={() => productsQuery.refetch()}
      />
    );
  } else if (!meta || meta.total === 0) {
    listing = (
      <CatalogEmpty
        description="Try another category, brand, or price range."
        onClear={clearFilters}
      />
    );
  } else {
    listing = (
      <div className="space-y-6">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <CatalogEmpty
            title="Nothing on this page"
            description="This page is past the end of the results."
            onClear={() => changePage(1)}
          />
        )}
        {meta.totalPages > 1 ? (
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={changePage} />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Search, filter, and sort the catalog. Your choices stay in the address bar."
      />
      <div className="mb-6">
        {categories.isError ? (
          <CatalogError
            title="Couldn't load categories"
            description={apiErrorMessage(categories.error)}
            onRetry={() => categories.refetch()}
          />
        ) : (
          <CategoryChips
            categories={categoryOptions}
            value={filters.category}
            onChange={(category) => updateFilters({ category })}
          />
        )}
      </div>
      <div className={desktop ? 'flex items-start gap-6' : 'space-y-4'}>
        {desktop ? (
          <Card title="Filters" className="w-72 shrink-0">
            <FilterPanel
              filters={filters}
              categories={categoryOptions}
              brands={brands}
              onChange={updateFilters}
              onClear={clearFilters}
            />
          </Card>
        ) : (
          <div>
            <Button variant="outline" onClick={() => setFiltersOpen(true)}>
              <i className="bi bi-funnel" />
              Filters
            </Button>
            <Drawer open={filtersOpen} title="Filters" onClose={() => setFiltersOpen(false)}>
              <FilterPanel
                filters={filters}
                categories={categoryOptions}
                brands={brands}
                onChange={updateFilters}
                onClear={clearFilters}
              />
            </Drawer>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted-green">
              {meta && !productsQuery.isLoading
                ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}`
                : ' '}
            </p>
            <div className="w-full sm:w-56">
              <Select
                id="catalog-sort"
                label="Sort"
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value })}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="relevance">Relevance</option>
              </Select>
            </div>
          </div>
          {listing}
        </div>
      </div>
    </div>
  );
}
