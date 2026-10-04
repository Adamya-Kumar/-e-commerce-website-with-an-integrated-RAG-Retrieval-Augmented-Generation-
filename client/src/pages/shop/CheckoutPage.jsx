import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createAddressRequest, fetchAddresses } from '../../api/addresses.js';
import { apiErrorMessage } from '../../api/http.js';
import { placeOrderRequest } from '../../api/cart.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useAuth } from '../../context/useAuth.js';
import { useCart } from '../../context/useCart.js';
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, refresh } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [order, setOrder] = useState(null);

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const next = await fetchAddresses();
      setAddresses(next);
      const defaultAddress = next.find((item) => item.isDefault) || next[0];
      setSelectedAddressId(defaultAddress ? defaultAddress.id || defaultAddress._id : '');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoadingAddresses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=%2Fcheckout', { replace: true });
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (user) {
      void loadAddresses();
    }
  }, [loadAddresses, user]);

  useEffect(() => {
    if (!cartLoading && !order && cart.items.length === 0) {
      navigate('/products', { replace: true });
    }
  }, [cart.items.length, cartLoading, navigate, order]);

  function updateAddressForm(key, value) {
    setAddressForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateAddress(event) {
    event.preventDefault();
    const payload = {
      ...addressForm,
      label: addressForm.label.trim(),
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      line1: addressForm.line1.trim(),
      line2: addressForm.line2.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.trim(),
      isDefault: Boolean(addressForm.isDefault),
    };

    if (!payload.fullName || !payload.phone || !payload.line1 || !payload.city || !payload.state || !payload.pincode) {
      toast.error('Please complete all required shipping details.');
      return;
    }

    setSubmittingAddress(true);
    try {
      const created = await createAddressRequest(payload);
      setAddresses((current) => [...current, created]);
      setSelectedAddressId(created.id || created._id);
      setAddressForm(emptyAddress);
      setShowAddressForm(false);
      toast.success('Address saved.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmittingAddress(false);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      toast.error('Choose a delivery address to continue.');
      return;
    }
    setPlacingOrder(true);
    try {
      const next = await placeOrderRequest(selectedAddressId);
      setOrder(next);
      await refresh(true);
      toast.success('Order placed successfully.');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409) {
        toast.error('One or more items sold out while you were checking out. The cart has been refreshed.');
      } else {
        toast.error(apiErrorMessage(error));
      }
      await refresh(true);
    } finally {
      setPlacingOrder(false);
    }
  }

  if (authLoading || cartLoading || loadingAddresses) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Preparing checkout" />
      </div>
    );
  }

  if (order) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-light bg-card p-6 shadow-spark-md">
        <PageHeader title="Order placed" subtitle="Your cash on delivery order is confirmed." />
        <div className="rounded-2xl border border-light bg-canvas p-5">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted-green">Order ID</p>
          <p className="mt-2 text-2xl font-extrabold text-main">{order.id || order._id}</p>
          <p className="mt-5 text-sm font-semibold text-muted-green">Status: {order.status}</p>
        </div>
        <div className="mt-6 rounded-2xl border border-light bg-card p-5">
          <h2 className="text-lg font-bold text-main">Timeline</h2>
          <ul className="mt-4 space-y-3">
            {(order.timeline || []).map((entry) => (
              <li key={`${entry.status}-${entry.at}`} className="flex items-start gap-3 rounded-lg bg-canvas p-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-lime" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold capitalize text-main">{entry.status.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-green">
                    {entry.note || 'Updated'} • {new Date(entry.at).toLocaleString('en-IN')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/products">
            <Button variant="outline">Continue shopping</Button>
          </Link>
          <Link to="/account">
            <Button variant="primary">View orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <>
      <PageHeader title="Checkout" subtitle="Choose an address and confirm your cash on delivery order." />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-light bg-card p-5 shadow-spark-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-main">Delivery address</h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddressForm((value) => !value)}>
                {showAddressForm ? 'Cancel' : 'Add address'}
              </Button>
            </div>

            {showAddressForm ? (
              <form onSubmit={handleCreateAddress} className="space-y-4 rounded-2xl border border-light bg-canvas p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="address-label"
                    label="Label"
                    value={addressForm.label}
                    onChange={(event) => updateAddressForm('label', event.target.value)}
                    placeholder="Home, Office, etc."
                  />
                  <Input
                    id="address-fullname"
                    label="Full name"
                    value={addressForm.fullName}
                    onChange={(event) => updateAddressForm('fullName', event.target.value)}
                    placeholder="Your name"
                  />
                  <Input
                    id="address-phone"
                    label="Phone"
                    value={addressForm.phone}
                    onChange={(event) => updateAddressForm('phone', event.target.value)}
                    placeholder="9876543210"
                  />
                  <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-main">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) => updateAddressForm('isDefault', event.target.checked)}
                    />
                    Make this my default address
                  </label>
                </div>
                <Textarea
                  id="address-line1"
                  label="Address line 1"
                  value={addressForm.line1}
                  onChange={(event) => updateAddressForm('line1', event.target.value)}
                  placeholder="House no., street name"
                />
                <Input
                  id="address-line2"
                  label="Address line 2 (optional)"
                  value={addressForm.line2}
                  onChange={(event) => updateAddressForm('line2', event.target.value)}
                  placeholder="Apartment, landmark, etc."
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    id="address-city"
                    label="City"
                    value={addressForm.city}
                    onChange={(event) => updateAddressForm('city', event.target.value)}
                    placeholder="Bengaluru"
                  />
                  <Input
                    id="address-state"
                    label="State"
                    value={addressForm.state}
                    onChange={(event) => updateAddressForm('state', event.target.value)}
                    placeholder="Karnataka"
                  />
                  <Input
                    id="address-pincode"
                    label="Pincode"
                    value={addressForm.pincode}
                    onChange={(event) => updateAddressForm('pincode', event.target.value)}
                    placeholder="560001"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submittingAddress}>
                    {submittingAddress ? 'Saving…' : 'Save address'}
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="mt-4 space-y-3">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-green">No addresses yet. Add a shipping address to place your order.</p>
              ) : (
                addresses.map((address) => (
                  <label
                    key={address.id || address._id}
                    className={`block cursor-pointer rounded-2xl border p-4 transition ${
                      selectedAddressId === (address.id || address._id)
                        ? 'border-forest-medium bg-lime-soft'
                        : 'border-light bg-canvas'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === (address.id || address._id)}
                        onChange={() => setSelectedAddressId(address.id || address._id)}
                        className="mt-1 h-4 w-4 accent-forest-medium"
                      />
                      <div className="flex-1 text-sm text-main">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{address.label || 'Address'}</span>
                          {address.isDefault ? (
                            <span className="rounded-full bg-lime px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-forest-medium">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 font-semibold">{address.fullName}</p>
                        <p className="mt-1">{address.line1}</p>
                        {address.line2 ? <p>{address.line2}</p> : null}
                        <p>
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="mt-1">{address.phone}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-light bg-card p-5 shadow-spark-md">
          <h2 className="text-lg font-bold text-main">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 text-sm text-main">
                <span>
                  {item.title} × {item.qty}
                </span>
                <span className="font-semibold">{formatInr(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3 border-t border-light pt-4 text-sm text-main">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{formatInr(cart.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="font-semibold">{formatInr(cart.shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-main">
              <span>Total</span>
              <span>{formatInr(cart.total)}</span>
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={handlePlaceOrder} disabled={placingOrder || !selectedAddressId}>
            {placingOrder ? 'Placing order…' : 'Place order (Cash on Delivery)'}
          </Button>
        </aside>
      </div>
    </>
  );
}
