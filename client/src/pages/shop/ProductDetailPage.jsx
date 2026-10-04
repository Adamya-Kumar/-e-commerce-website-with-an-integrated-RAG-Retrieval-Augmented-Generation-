import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isNotFoundError, useProduct } from '../../api/products.js';
import { apiErrorMessage } from '../../api/http.js';
import CatalogError from '../../components/shop/CatalogError.jsx';
import DetailSkeleton from '../../components/shop/DetailSkeleton.jsx';
import PriceBlock from '../../components/shop/PriceBlock.jsx';
import ProductGallery from '../../components/shop/ProductGallery.jsx';
import QuantityStepper from '../../components/shop/QuantityStepper.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const productQuery = useProduct(slug);
  const product = productQuery.data;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [slug]);

  if (productQuery.isPending) {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading product</span>
        <DetailSkeleton />
      </div>
    );
  }

  if (productQuery.isError && isNotFoundError(productQuery.error)) {
    return (
      <CatalogError
        title="Product not found"
        description="That link does not match a product in the catalog."
        actionLabel="Browse products"
        onRetry={() => navigate('/products')}
      />
    );
  }

  if (productQuery.isError || !product) {
    return (
      <CatalogError
        title="Couldn't load this product"
        description={apiErrorMessage(productQuery.error)}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  const soldOut = product.stock < 1;
  const attributes = Object.entries(product.attributes || {});
  const categoryName =
    product.category && typeof product.category === 'object' ? product.category.name : '';

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
        <ProductGallery key={product.id} product={product} />
        <div>
          <p className="text-sm font-semibold text-muted-green">{product.brand}</p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-main">{product.title}</h1>
          {categoryName ? <p className="mt-2 text-sm text-muted-green">{categoryName}</p> : null}
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
