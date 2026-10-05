import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/http.js';
import { fetchAdminOrder, fetchAdminOrders, updateAdminOrderStatus } from '../../api/admin.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { formatInr } from '../../lib/money.js';

const PAGE_SIZE = 25;

const NEXT_STATUSES = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
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
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const result = await fetchAdminOrders(params);
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setTotalPages(result.meta?.totalPages || 0);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(orderId, status) {
    if (!status) return;
    try {
      setUpdatingId(orderId);
      setError('');
      await updateAdminOrderStatus(orderId, { status, note: `Updated to ${status.replace(/_/g, ' ')}` });
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(await fetchAdminOrder(orderId));
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function showOrder(orderId) {
    setDetailLoading(true);
    setSelectedOrder({ id: orderId });
    try {
      setSelectedOrder(await fetchAdminOrder(orderId));
    } catch (err) {
      setError(apiErrorMessage(err));
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Orders" subtitle="Track incoming customer orders and advance each status to the next legal step." />
        <Button variant="outline" size="sm" onClick={() => void loadOrders()} disabled={loading}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-sys-red/30 bg-card p-3 text-sm text-sys-red" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-4 max-w-xs">
        <Select id="admin-order-status-filter" label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="rounded-xxl bg-card p-6 shadow-spark-sm"><Spinner label="Loading orders" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-xxl border border-dashed border-light bg-card p-10 text-center text-sm text-muted-green">
          No customer orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xxl bg-card shadow-spark-md">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-canvas text-xs uppercase text-muted-green">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderId = order.id || order._id;
                  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <tr key={orderId} className="border-t border-light align-top hover:bg-lime-soft/30">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-main">#{String(orderId || '').slice(-6).toUpperCase()}</div>
                        <div className="text-xs text-muted-green">{order.paymentMethod || 'COD'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-main">{order.user?.name || 'Customer'}</div>
                        <div className="text-xs text-muted-green">{order.user?.email || '-'}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-green">
                        {Array.isArray(order.items) ? order.items.length : 0} item(s)
                      </td>
                      <td className="px-5 py-4 font-semibold text-main">{formatInr(order.total || 0)}</td>
                      <td className="px-5 py-4">
                        {nextStatuses.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(event) => { if (event.target.value !== order.status) void updateStatus(orderId, event.target.value); }}
                              disabled={updatingId === orderId}
                              aria-label={`Advance order ${String(orderId).slice(-6)}`}
                              className="max-w-[190px] rounded-lg border border-light bg-card px-2 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-forest-medium/20"
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
                          <StatusBadge status={order.status} />
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-green">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="px-5 py-4 text-right"><Button size="sm" variant="ghost" aria-label={`View order ${String(orderId).slice(-6)}`} onClick={() => void showOrder(orderId)}><i className="bi bi-eye" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? <div className="border-t border-light p-4"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div> : null}
        </div>
      )}

      <Modal open={Boolean(selectedOrder)} title={selectedOrder?.id ? `Order #${String(selectedOrder.id).slice(-6).toUpperCase()}` : 'Order details'} onClose={() => setSelectedOrder(null)} className="max-h-[90vh] max-w-2xl overflow-y-auto" footer={null}>
        {detailLoading ? <div className="py-12"><Spinner label="Loading order details" /></div> : selectedOrder?.status ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><StatusBadge status={selectedOrder.status} /><span className="text-sm font-bold text-main">{formatInr(selectedOrder.total || 0)}</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-canvas p-4"><h3 className="font-bold text-main">Customer</h3><p className="mt-2 text-sm text-main">{selectedOrder.user?.name || 'Customer'}</p><p className="text-sm text-muted-green">{selectedOrder.user?.email || '—'}</p></div>
              <div className="rounded-xl bg-canvas p-4"><h3 className="font-bold text-main">Delivery address</h3><p className="mt-2 text-sm text-main">{selectedOrder.shippingAddress?.fullName}</p><p className="text-sm text-muted-green">{selectedOrder.shippingAddress?.line1}, {selectedOrder.shippingAddress?.city}</p><p className="text-sm text-muted-green">{selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.pincode}</p></div>
            </div>
            <div><h3 className="font-bold text-main">Items</h3><ul className="mt-2 divide-y divide-light">{(selectedOrder.items || []).map((item, index) => <li key={`${item.product || item.title}-${index}`} className="flex items-center gap-3 py-3"><img src={item.image || 'https://placehold.co/96x96?text=Product'} alt="" className="h-12 w-12 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-main">{item.title}</span><span className="text-xs text-muted-green">Qty {item.qty}</span></span><span className="font-semibold text-main">{formatInr((item.unitPrice || 0) * (item.qty || 0))}</span></li>)}</ul></div>
            <div><h3 className="font-bold text-main">Timeline</h3><ul className="mt-2 space-y-2">{(selectedOrder.timeline || []).map((entry, index) => <li key={`${entry.status}-${entry.at || index}`} className="flex gap-3 rounded-lg bg-canvas p-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-lime" aria-hidden="true" /><span><span className="block text-sm font-semibold capitalize text-main">{String(entry.status || '').replace(/_/g, ' ')}</span><span className="text-xs text-muted-green">{entry.note || 'Order updated'} · {entry.at ? new Date(entry.at).toLocaleString('en-IN') : '—'}</span></span></li>)}</ul></div>
          </div>
        ) : <p className="py-8 text-center text-sm text-muted-green">Order details are unavailable.</p>}
      </Modal>
    </div>
  );
}
