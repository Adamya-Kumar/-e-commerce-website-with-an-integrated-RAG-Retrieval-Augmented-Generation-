import { formatInr } from '../../lib/money.js';

export default function CartCard({ cart }) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  const total = Number(cart?.total ?? cart?.subtotal ?? 0);

  return (
    <div className="rounded-2xl border border-light bg-white p-3 shadow-spark-sm">
      <p className="text-sm font-semibold text-main">Your cart</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-green">Your cart is empty.</p>
        ) : (
          items.slice(0, 3).map((item, index) => (
            <div key={`${item?.productId || item?.id || 'item'}-${index}`} className="flex items-center justify-between gap-3 text-xs text-muted-green">
              <span className="line-clamp-1">{item?.title || item?.productTitle || 'Product'}</span>
              <span className="font-semibold text-main">{item?.qty || 1} × {formatInr(Number(item?.unitPrice ?? item?.price ?? 0))}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-light pt-2 text-sm font-semibold">
        <span>Total</span>
        <span className="text-forest-medium">{formatInr(total)}</span>
      </div>
    </div>
  );
}
