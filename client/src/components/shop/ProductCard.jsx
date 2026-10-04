import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import PriceBlock from './PriceBlock.jsx';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ product }) {
  const soldOut = product.stock < 1;

  return (
    <article className="flex h-full flex-col rounded-xl bg-card p-4 shadow-spark-md">
      <Link to={`/products/${product.slug}`} className="block">
        <ProductImage src={product.images?.[0]?.url} label={product.title} />
        <h3 className="mt-3 text-base font-bold text-main">{product.title}</h3>
        <p className="mt-1 text-sm text-muted-green">{product.brand}</p>
      </Link>
      <div className="mt-3">
        <PriceBlock price={product.price} discountPercent={product.discountPercent} />
      </div>
      <Button variant="dark-pill" className="mt-4 w-full" disabled={soldOut}>
        {soldOut ? 'Out of stock' : 'Add to cart'}
      </Button>
    </article>
  );
}
