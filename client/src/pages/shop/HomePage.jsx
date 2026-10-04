import { Link } from 'react-router-dom';
import { useCategories, useProducts } from '../../api/products.js';
import { apiErrorMessage } from '../../api/http.js';
import CatalogError from '../../components/shop/CatalogError.jsx';
import CategoryChips from '../../components/shop/CategoryChips.jsx';
import HeroBanner from '../../components/shop/HeroBanner.jsx';
import ProductCard from '../../components/shop/ProductCard.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';

const featuredQuery = { inStock: true, limit: 4, sort: 'newest', page: 1 };

export default function HomePage() {
  const categories = useCategories();
  const featured = useProducts(featuredQuery);
  const products = featured.data?.products ?? [];

  return (
    <div className="space-y-10">
      <HeroBanner />
      <section>
        <h2 className="mb-4 text-[1.1rem] font-bold text-main">Shop by category</h2>
        {categories.isPending ? (
          <div className="flex gap-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        ) : null}
        {categories.isError ? (
          <CatalogError
            title="Couldn't load categories"
            description={apiErrorMessage(categories.error)}
            onRetry={() => categories.refetch()}
          />
        ) : null}
        {categories.data ? <CategoryChips categories={categories.data} /> : null}
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-[1.1rem] font-bold text-main">Featured</h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-forest-medium transition duration-200 ease-in-out hover:text-forest-dark"
          >
            View all
          </Link>
        </div>
        {featured.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            <span className="sr-only">Loading products</span>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : null}
        {featured.isError ? (
          <CatalogError
            title="Couldn't load products"
            description={apiErrorMessage(featured.error)}
            onRetry={() => featured.refetch()}
          />
        ) : null}
        {featured.data && products.length === 0 ? (
          <p className="text-sm text-muted-green">No products are in stock right now.</p>
        ) : null}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
