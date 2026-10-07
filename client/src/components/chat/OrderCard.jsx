import { formatInr } from '../../lib/money.js';

function getOrderId(order) {
  return order?.id || order?._id || order?.orderId || 'order';
}

export default function OrderCard({ order }) {
  const orderValue = order ?? {};
  const total = Number(orderValue.total ?? orderValue.amount ?? 0);

  return (
    <div className="rounded-2xl border border-light bg-white p-3 shadow-spark-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-main">Order #{String(getOrderId(orderValue)).slice(-6)}</p>
        <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-forest-medium">
          {orderValue.status || 'placed'}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-green">{orderValue.items?.length || 0} item(s)</p>
      <div className="mt-3 flex items-center justify-between text-sm font-semibold">
        <span>Total</span>
        <span className="text-forest-medium">{formatInr(total)}</span>
      </div>
    </div>
  );
}
