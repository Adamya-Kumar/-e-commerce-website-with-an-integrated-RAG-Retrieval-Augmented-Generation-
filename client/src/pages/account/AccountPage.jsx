import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api/http.js';
import {
  createAddressRequest,
  deleteAddressRequest,
  fetchAddresses,
  updateAddressRequest,
} from '../../api/addresses.js';
import {
  cancelOrderRequest,
  fetchOrders,
  returnOrderRequest,
} from '../../api/orders.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useAuth } from '../../context/useAuth.js';
import { useToast } from '../../context/useToast.js';
import { formatInr } from '../../lib/money.js';

const emptyAddress = {
  label: '',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getOrderId(order) {
  return order?.id || order?._id;
}

function getTimelineDeliveredAt(order) {
  const timeline = Array.isArray(order?.timeline) ? order.timeline : [];
  const entry = timeline.find((item) => item?.status === 'delivered');
  return entry?.at ? new Date(entry.at) : null;
}

function canCancelOrder(order) {
  return ['placed', 'confirmed', 'packed'].includes(order?.status);
}

function canReturnOrder(order) {
  if (!order || order.status !== 'delivered' || order.status === 'return_requested' || order.status === 'returned') {
    return false;
  }
  const deliveredAt = getTimelineDeliveredAt(order);
  if (!deliveredAt) return false;
  const differenceMs = Date.now() - deliveredAt.getTime();
  return differenceMs <= 7 * 24 * 60 * 60 * 1000;
}

function AccountNavigation() {
  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-light bg-card p-2 shadow-spark-sm">
      {[
        { label: 'Orders', to: 'orders' },
        { label: 'Addresses', to: 'addresses' },
        { label: 'Profile', to: 'profile' },
      ].map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-forest-medium text-white shadow-spark-sm'
                : 'text-muted-green hover:bg-canvas hover:text-main',
            ].join(' ')
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function OrdersTab() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchOrders();
      setOrders(Array.isArray(next) ? next : []);
      setLoadError('');
      setSelectedId((current) => current || (next[0] ? getOrderId(next[0]) : ''));
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    function refreshOrdersOnFocus() {
      if (document.visibilityState === 'visible') {
        void loadOrders();
      }
    }
    window.addEventListener('focus', refreshOrdersOnFocus);
    return () => window.removeEventListener('focus', refreshOrdersOnFocus);
  }, [loadOrders]);

  const selectedOrder = useMemo(
    () => orders.find((order) => getOrderId(order) === selectedId) || orders[0] || null,
    [orders, selectedId],
  );

  useEffect(() => {
    if (orders.length > 0 && !selectedId) {
      setSelectedId(getOrderId(orders[0]));
    }
  }, [orders, selectedId]);

  async function handleCancel(orderId) {
    const confirmed = window.confirm('Do you want to cancel this order?');
    if (!confirmed) return;
    const reason = window.prompt('Optional cancellation reason:', 'Changed my mind');
    try {
      const next = await cancelOrderRequest(orderId, reason || '');
      setOrders((current) =>
        current.map((order) => (getOrderId(order) === orderId ? next : order)),
      );
      toast.success('Order cancelled.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleReturn(orderId) {
    const confirmed = window.confirm('Request a return for this delivered order?');
    if (!confirmed) return;
    const reason = window.prompt('Why are you returning this order?', 'Not satisfied with the product');
    if (!reason) {
      toast.error('A return reason is required.');
      return;
    }
    try {
      const next = await returnOrderRequest(orderId, reason);
      setOrders((current) =>
        current.map((order) => (getOrderId(order) === orderId ? next : order)),
      );
      toast.success('Return requested.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-light bg-card p-6">
        <Spinner label="Loading orders" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-sys-red/30 bg-card p-6 text-sm text-sys-red" role="alert">
        <p>{loadError}</p>
        <Button className="mt-4" size="sm" variant="outline" onClick={() => void loadOrders()}>
          Try again
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-light bg-card p-6 text-sm text-muted-green">
        You have no orders yet. Start shopping to see your order history here.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
      <div className="space-y-3">
        {orders.map((order) => {
          const orderId = getOrderId(order);
          return (
            <button
              key={orderId}
              type="button"
              onClick={() => setSelectedId(orderId)}
              className={[
                'w-full rounded-2xl border bg-card p-4 text-left transition',
                selectedOrder && orderId === getOrderId(selectedOrder)
                  ? 'border-forest-medium bg-lime-soft'
                  : 'border-light hover:border-forest-medium/60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Order</p>
                  <p className="mt-1 font-bold text-main">#{String(orderId).slice(-8)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-green">
                <span>{formatDate(order.createdAt)}</span>
                <span className="font-semibold text-main">{formatInr(order.total)}</span>
              </div>
              <p className="mt-3 text-sm text-main">{order.items?.length || 0} item(s)</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-light bg-card p-5">
        {selectedOrder ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Selected order</p>
                <h3 className="mt-1 text-xl font-extrabold text-main">#{String(getOrderId(selectedOrder)).slice(-8)}</h3>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canCancelOrder(selectedOrder) ? (
                <Button size="sm" variant="outline" onClick={() => handleCancel(getOrderId(selectedOrder))}>
                  Cancel
                </Button>
              ) : null}
              {canReturnOrder(selectedOrder) ? (
                <Button size="sm" variant="accent" onClick={() => handleReturn(getOrderId(selectedOrder))}>
                  Return
                </Button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Delivery</p>
                <p className="mt-2 font-semibold text-main">{selectedOrder.shippingAddress?.fullName}</p>
                <p className="text-sm text-main">{selectedOrder.shippingAddress?.line1}</p>
                <p className="text-sm text-main">
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Summary</p>
                <div className="mt-2 space-y-2 text-sm text-main">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatInr(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span>{formatInr(selectedOrder.shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-main">
                    <span>Total</span>
                    <span>{formatInr(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-bold text-main">Items</h4>
              <div className="mt-3 space-y-3">
                {(selectedOrder.items || []).map((item) => (
                  <div key={`${getOrderId(selectedOrder)}-${item.product || item.title}`} className="flex items-center gap-3 rounded-xl bg-canvas p-3">
                    <img
                      src={item.image || 'https://placehold.co/120x120?text=Product'}
                      alt={item.title}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-main">{item.title}</p>
                      <p className="text-sm text-muted-green">Qty: {item.qty}</p>
                    </div>
                    <p className="font-bold text-main">{formatInr(item.unitPrice * item.qty)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-bold text-main">Timeline</h4>
              <ul className="mt-3 space-y-3">
                {(Array.isArray(selectedOrder.timeline) ? selectedOrder.timeline : []).map((entry, index) => (
                  <li key={`${entry?.status || 'update'}-${entry?.at || index}`} className="flex gap-3 rounded-xl bg-canvas p-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lime" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold capitalize text-main">{String(entry?.status || 'Order updated').replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-green">{entry.note || 'Order updated'} • {formatDate(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function AddressesTab() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyAddress);
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAddresses();
      setAddresses(next);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  function resetForm() {
    setForm(emptyAddress);
    setEditingId('');
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      label: form.label.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      isDefault: Boolean(form.isDefault),
    };

    if (!payload.fullName || !payload.phone || !payload.line1 || !payload.city || !payload.state || !payload.pincode) {
      toast.error('Please complete all required shipping fields.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateAddressRequest(editingId, payload);
        setAddresses((current) => current.map((item) => ((item.id || item._id) === editingId ? updated : item)));
        toast.success('Address updated.');
      } else {
        const created = await createAddressRequest(payload);
        setAddresses((current) => [...current, created]);
        toast.success('Address saved.');
      }
      resetForm();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(address) {
    setEditingId(address.id || address._id);
    setForm({
      label: address.label || '',
      fullName: address.fullName || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      isDefault: Boolean(address.isDefault),
    });
  }

  async function handleDelete(addressId) {
    const confirmed = window.confirm('Delete this address?');
    if (!confirmed) return;
    try {
      await deleteAddressRequest(addressId);
      setAddresses((current) => current.filter((item) => (item.id || item._id) !== addressId));
      if (editingId === addressId) resetForm();
      toast.success('Address removed.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function handleSetDefault(addressId) {
    const target = addresses.find((item) => (item.id || item._id) === addressId);
    if (!target) return;
    try {
      const updated = await updateAddressRequest(addressId, { ...target, isDefault: true });
      setAddresses((current) =>
        current.map((item) => {
          const itemId = item.id || item._id;
          const isSelected = itemId === addressId;
          return {
            ...item,
            isDefault: isSelected,
            ...(isSelected ? updated : {}),
          };
        }),
      );
      toast.success('Default address updated.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-light bg-card p-6">
        <Spinner label="Loading addresses" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-light bg-card p-5 text-sm text-muted-green">
            No saved addresses yet.
          </div>
        ) : (
          addresses.map((address) => {
            const addressId = address.id || address._id;
            return (
              <div key={addressId} className="rounded-2xl border border-light bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-main">{address.label || 'Address'}</p>
                    {address.isDefault ? (
                      <span className="mt-1 inline-flex rounded-full bg-lime px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-forest-medium">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {!address.isDefault ? (
                      <Button size="sm" variant="outline" onClick={() => handleSetDefault(addressId)}>
                        Set default
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(address)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(addressId)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-main">
                  <p className="font-semibold">{address.fullName}</p>
                  <p>{address.line1}</p>
                  {address.line2 ? <p>{address.line2}</p> : null}
                  <p>
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p>{address.phone}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-light bg-card p-5">
        <h3 className="text-lg font-bold text-main">{editingId ? 'Edit address' : 'Add address'}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input id="account-label" label="Label" value={form.label} onChange={(event) => updateField('label', event.target.value)} placeholder="Home, Office" />
          <Input id="account-fullname" label="Full name" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Your name" />
          <Input id="account-phone" label="Phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="9876543210" />
          <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-main">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => updateField('isDefault', event.target.checked)} />
            Default address
          </label>
        </div>
        <div className="mt-4">
          <Textarea id="account-line1" label="Address line 1" value={form.line1} onChange={(event) => updateField('line1', event.target.value)} placeholder="House no., street name" />
        </div>
        <div className="mt-4">
          <Input id="account-line2" label="Address line 2 (optional)" value={form.line2} onChange={(event) => updateField('line2', event.target.value)} placeholder="Apartment or landmark" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Input id="account-city" label="City" value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Bengaluru" />
          <Input id="account-state" label="State" value={form.state} onChange={(event) => updateField('state', event.target.value)} placeholder="Karnataka" />
          <Input id="account-pincode" label="Pincode" value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} placeholder="560001" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update address' : 'Save address'}</Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function ProfileTab() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-light bg-card p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Profile</p>
          <h3 className="mt-2 text-2xl font-extrabold text-main">{user.name}</h3>
          <p className="mt-2 text-sm text-muted-green">{user.email}</p>
          <div className="mt-4 space-y-2 text-sm text-main">
            <p><span className="font-semibold">Role:</span> {user.role || 'customer'}</p>
            <p><span className="font-semibold">Joined:</span> {formatDate(user.createdAt)}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-green">Quick actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/account/orders')}>View orders</Button>
            <Button variant="outline" onClick={() => navigate('/account/addresses')}>Manage addresses</Button>
            <Button variant="danger" onClick={handleLogout}>Log out</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="My account" subtitle={`${user.name} · ${user.email}`} />
      <div className="mt-6 space-y-6">
        <AccountNavigation />
        <Routes>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<OrdersTab />} />
          <Route path="addresses" element={<AddressesTab />} />
          <Route path="profile" element={<ProfileTab />} />
        </Routes>
      </div>
    </div>
  );
}

