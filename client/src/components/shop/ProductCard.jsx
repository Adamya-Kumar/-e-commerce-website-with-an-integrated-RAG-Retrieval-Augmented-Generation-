import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/useCart.js';
import Button from '../ui/Button.jsx';
import PriceBlock from './PriceBlock.jsx';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ product }) {
  const soldOut = product.stock < 1;
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [adding, setAdding] = useState(false);

  async function handleAddToCart(event) {
    event.preventDefault();
    if (soldOut) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
    } catch (error) {
      if (error?.message === 'UNAUTHENTICATED') {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      }
    } finally {
      setAdding(false);
    }
  }

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
      <Button
        variant="dark-pill"
        className="mt-4 w-full"
        disabled={soldOut || adding}
        onClick={handleAddToCart}
      >
        {soldOut ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
      </Button>
    </article>
  );
}
