import { useCallback, useEffect, useMemo, useState } from 'react';
import { http, apiErrorMessage } from '../../api/http.js';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { formatInr } from '../../lib/money.js';

const NEXT_STATUSES = {
  placed: ['confirmed'],
  confirmed: ['packed'],
  packed: ['shipped'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  return_requested: ['returned'],
  cancelled: [],
  returned: [],
};

const STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  return_requested: 'Return requested',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await http.get('/admin/orders', {
        params: { page: 1, limit: 25 },
      });
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateStatus = useCallback(
    async (orderId, status) => {
      if (!status) return;
      try {
        setUpdatingId(orderId);
        setError('');
        await http.patch(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
          status,
          note: `Updated to ${status}`,
        });
        await loadOrders();
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setUpdatingId(null);
      }
    },
    [loadOrders],
  );

  const totalCount = useMemo(() => orders.length, [orders]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Track incoming customer orders and advance each status to the next legal step." />

      {error ? (
        <div className="mb-4 rounded-xl border border-sys-red/30 bg-sys-red/10 p-3 text-sm text-sys-red">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-spark-sm">
          <Spinner label="Loading orders" />
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-muted-green">
          No customer orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-spark-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-main">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderId = order.id || order._id;
                  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <tr key={orderId} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-main">#{String(orderId || '').slice(-6).toUpperCase()}</div>
                        <div className="text-xs text-muted-green">{order.paymentMethod || 'COD'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-main">{order.user?.name || 'Customer'}</div>
                        <div className="text-xs text-muted-green">{order.user?.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-green">
                        {Array.isArray(order.items) ? order.items.length : 0} item(s)
                      </td>
                      <td className="px-4 py-3 font-semibold text-main">{formatInr(order.total || 0)}</td>
                      <td className="px-4 py-3">
                        {nextStatuses.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(event) => void updateStatus(orderId, event.target.value)}
                              disabled={updatingId === orderId}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-forest-medium/20"
                            >
                              <option value={order.status}>{STATUS_LABELS[order.status] || order.status}</option>
                              {nextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {STATUS_LABELS[status] || status}
                                </option>
                              ))}
                            </select>
                            {updatingId === orderId ? <Spinner className="text-xs" label="" /> : null}
                          </div>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-main">
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-green">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void loadOrders()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
