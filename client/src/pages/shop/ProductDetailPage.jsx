import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CatalogEmpty from '../../components/shop/CatalogEmpty.jsx';
import CatalogError from '../../components/shop/CatalogError.jsx';
import DetailSkeleton from '../../components/shop/DetailSkeleton.jsx';
import PriceBlock from '../../components/shop/PriceBlock.jsx';
import ProductGallery from '../../components/shop/ProductGallery.jsx';
import QuantityStepper from '../../components/shop/QuantityStepper.jsx';
import Button from '../../components/ui/Button.jsx';
import { PLACEHOLDER_PRODUCTS } from '../../data/placeholderCatalog.js';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const product = PLACEHOLDER_PRODUCTS.find((entry) => entry.slug === slug);
  const view = params.get('view');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [slug]);

  function clearView() {
    const next = new URLSearchParams(params);
    next.delete('view');
    setParams(next, { replace: true });
  }

  if (view === 'loading') {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading product</span>
        <DetailSkeleton />
      </div>
    );
  }

  if (view === 'empty') {
    return (
      <CatalogEmpty
        title="Nothing to show"
        description="This product has no gallery or details in the placeholder catalog."
      />
    );
  }

  if (view === 'error' || !product) {
    return (
      <CatalogError
        title="Couldn't load this product"
        description="Check the link or go back to the catalog."
        onRetry={() => {
          if (product) clearView();
          else navigate('/products');
        }}
      />
    );
  }

  const soldOut = product.stock < 1;
  const attributes = Object.entries(product.attributes);

  return (
    <div>
      <Link
        to="/products"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-green transition duration-200 ease-in-out hover:text-forest-medium"
      >
        <i className="bi bi-arrow-left" />
        Products
      </Link>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <ProductGallery product={product} />
        <div>
          <p className="text-sm font-semibold text-muted-green">{product.brand}</p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-main">{product.title}</h1>
          <p className="mt-2 text-sm text-muted-green">{product.category}</p>
          <div className="mt-6">
            <PriceBlock price={product.price} discountPercent={product.discountPercent} size="detail" />
          </div>
          <p className="mt-5 max-w-prose text-sm leading-relaxed text-main">{product.description}</p>
          {attributes.length > 0 ? (
            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attributes.map(([key, value]) => (
                <div key={key} className="rounded-lg bg-card px-4 py-3 shadow-spark-sm">
                  <dt className="text-xs font-bold uppercase tracking-[0.05em] text-muted-green">{key}</dt>
                  <dd className="mt-1 text-sm font-semibold text-main">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="mt-6 text-sm font-semibold text-muted-green">
            {soldOut ? 'Out of stock' : `${product.stock} in stock`}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper
              value={soldOut ? 0 : qty}
              min={soldOut ? 0 : 1}
              max={product.stock}
              disabled={soldOut}
              onChange={setQty}
            />
            <Button variant="accent" className="sm:flex-1" disabled={soldOut}>
              Add to cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
