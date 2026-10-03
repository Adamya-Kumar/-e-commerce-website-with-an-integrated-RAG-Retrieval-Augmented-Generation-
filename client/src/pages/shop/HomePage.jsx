import { Link } from 'react-router-dom';
import CategoryChips from '../../components/shop/CategoryChips.jsx';
import HeroBanner from '../../components/shop/HeroBanner.jsx';
import ProductCard from '../../components/shop/ProductCard.jsx';
import { PLACEHOLDER_CATEGORIES, PLACEHOLDER_PRODUCTS } from '../../data/placeholderCatalog.js';

const featured = PLACEHOLDER_PRODUCTS.filter((product) => product.stock > 0).slice(0, 4);

export default function HomePage() {
  return (
    <div className="space-y-10">
      <HeroBanner />
      <section>
        <h2 className="mb-4 text-[1.1rem] font-bold text-main">Shop by category</h2>
        <CategoryChips categories={PLACEHOLDER_CATEGORIES} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
