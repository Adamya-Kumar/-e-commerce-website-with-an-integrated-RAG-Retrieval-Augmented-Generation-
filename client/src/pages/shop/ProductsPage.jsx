import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_PRODUCTS,
  brandsInCatalog,
  filterPlaceholderProducts,
} from '../../data/placeholderCatalog.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { rupeesToPaise } from '../../lib/money.js';

const brands = brandsInCatalog();

function emptyFilters(category = 'All') {
  return {
    category,
    brand: 'All',
    minRupees: '',
    maxRupees: '',
    inStock: false,
  };
}

export default function ProductsPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const desktop = useMediaQuery('(min-width: 992px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() =>
    emptyFilters(location.state?.category || 'All'),
  );

  const view = params.get('view');

  useEffect(() => {
    const category = location.state?.category;
    if (!category) return;
    setFilters((current) => ({ ...current, category }));
  }, [location.state]);

  const products = useMemo(
    () =>
      filterPlaceholderProducts(PLACEHOLDER_PRODUCTS, {
        category: filters.category,
        brand: filters.brand,
        inStock: filters.inStock,
        minPaise: rupeesToPaise(filters.minRupees),
        maxPaise: rupeesToPaise(filters.maxRupees),
      }),
    [filters],
  );

  function clearView() {
    const next = new URLSearchParams(params);
    next.delete('view');
    setParams(next, { replace: true });
  }

  function clearFilters() {
    setFilters(emptyFilters());
    clearView();
  }

  let listing = null;
  if (view === 'loading') {
    listing = (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading products</span>
        <ListingSkeleton />
      </div>
    );
  } else if (view === 'error') {
    listing = (
      <CatalogError
        title="Couldn't load products"
        description="The placeholder catalog failed to load. Try again to see the sample grid."
        onRetry={clearView}
      />
    );
  } else if (view === 'empty' || products.length === 0) {
    listing = (
      <CatalogEmpty
        description="Try another category, brand, or price range."
        onClear={clearFilters}
      />
    );
  } else {
    listing = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Filter the sample catalog by category, brand, price, and stock."
      />
      <div className="mb-6">
        <CategoryChips
          categories={PLACEHOLDER_CATEGORIES}
          value={filters.category}
          onChange={(category) => setFilters((current) => ({ ...current, category }))}
        />
      </div>
      <div className={desktop ? 'flex items-start gap-6' : 'space-y-4'}>
        {desktop ? (
          <Card title="Filters" className="w-72 shrink-0">
            <FilterPanel
              filters={filters}
              brands={brands}
              onChange={setFilters}
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
                brands={brands}
                onChange={setFilters}
                onClear={() => {
                  clearFilters();
                  setFiltersOpen(false);
                }}
              />
            </Drawer>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {view === 'loading' || view === 'error' || view === 'empty' || products.length === 0 ? null : (
            <p className="mb-4 text-sm text-muted-green">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          )}
          {listing}
        </div>
      </div>
    </div>
  );
}
