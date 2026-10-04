import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../../components/shop/ProductImage.jsx';
import QuantityStepper from '../../components/shop/QuantityStepper.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useCart } from '../../context/useCart.js';
import { formatInr } from '../../lib/money.js';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, updateItem, removeItem } = useCart();
  const [busyId, setBusyId] = useState(null);

  async function handleQtyChange(productId, nextQty) {
    if (nextQty < 1) {
      await removeItem(productId);
      return;
    }
    setBusyId(productId);
    try {
      await updateItem(productId, nextQty);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading cart" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-light bg-card p-8 text-center shadow-spark-md">
        <PageHeader title="Your cart is empty" subtitle="Add a few products and come back here to check out." />
        <Link to="/products">
          <Button variant="primary">Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Your cart" subtitle={`${cart.items.length} ${cart.items.length === 1 ? 'item' : 'items'} ready for checkout.`} />

      <div className="grid gap-8 lg:grid-cols-[1.8fr_0.9fr]">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId} className="rounded-2xl border border-light bg-card p-4 shadow-spark-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to={`/products/${item.slug}`} className="flex items-center gap-4">
                  <ProductImage src={item.image} label={item.title} className="h-20 w-20 shrink-0" />
                  <div>
                    <h2 className="text-base font-bold text-main">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-green">{formatInr(item.unitPrice)} each</p>
                  </div>
                </Link>
                <div className="ml-auto text-left sm:text-right">
                  <p className="text-base font-extrabold text-main">{formatInr(item.lineTotal)}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-sys-red hover:underline"
                    onClick={() => removeItem(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <QuantityStepper
                  value={item.qty}
                  max={item.stock}
                  disabled={busyId === item.productId}
                  onChange={(nextQty) => handleQtyChange(item.productId, nextQty)}
                />
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-green">
                  {item.stock} in stock
                </p>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-light bg-card p-5 shadow-spark-md">
          <h2 className="text-lg font-bold text-main">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm text-main">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{formatInr(cart.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="font-semibold">{formatInr(cart.shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-light pt-3 text-base font-bold text-main">
              <span>Total</span>
              <span>{formatInr(cart.total)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={() => navigate('/checkout')}>
            Proceed to checkout
          </Button>
        </aside>
      </div>
    </>
  );
}
