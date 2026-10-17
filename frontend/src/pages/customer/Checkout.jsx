import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { checkoutApi } from '../../features/checkout/index.js';
import api, { apiErrorMessage, imageUrl } from '../../services/api.js';
import { formatPrice } from '../../utils/formatPrice.js';
import { isValidPhone, isValidPincode } from '../../utils/validators.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

// Razorpay publishable key comes from the backend (admin dashboard settings),
// with the Vite env var as a fallback for local dev.
const ENV_RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.body.appendChild(s);
  });
}

const EMPTY_ADDR = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

export default function Checkout() {
  const { cart, fetchCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepLoading, setStepLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [addrModal, setAddrModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrErrors, setAddrErrors] = useState({});
  const [addrSaving, setAddrSaving] = useState(false);
  const [coupon, setCoupon] = useState(location.state?.couponCode || '');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [razorpayKey, setRazorpayKey] = useState(ENV_RAZORPAY_KEY);
  const [razorpayOn, setRazorpayOn] = useState(Boolean(ENV_RAZORPAY_KEY));

  useEffect(() => {
    api.get('/settings/public')
      .then((r) => {
        const s = r.data?.data || {};
        if (s.razorpay_key_id) setRazorpayKey(s.razorpay_key_id);
        setRazorpayOn(String(s.razorpay_enabled) === '1' || String(s.razorpay_enabled).toLowerCase() === 'true' || Boolean(s.razorpay_key_id || ENV_RAZORPAY_KEY));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const addrs = await checkoutApi.addresses.list();
        setAddresses(addrs || []);
        const def = (addrs || []).find((a) => a.isDefault) || addrs?.[0];
        setSelectedAddr(def?.id || null);
      } catch {
        setAddresses([]);
      } finally {
        setStepLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (location.state?.couponCode) {
      applyCoupon(location.state.couponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.subtotal]);

  const applyCoupon = async (codeArg) => {
    const code = (codeArg ?? coupon).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponInfo(null);
    try {
      const r = await checkoutApi.validateCoupon(code, cart.subtotal);
      setCoupon(code);
      setCouponInfo({ ok: true, discount: r.discount, code: r.coupon?.code || code });
    } catch (err) {
      setCouponInfo({ ok: false, message: apiErrorMessage(err, 'Invalid coupon') });
    } finally {
      setCouponLoading(false);
    }
  };

  const openAddrModal = (addr) => {
    setEditing(addr || null);
    setAddrForm(
      addr
        ? { fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2 || '', city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: !!addr.isDefault }
        : EMPTY_ADDR
    );
    setAddrErrors({});
    setAddrModal(true);
  };

  const validateAddr = () => {
    const e = {};
    if (!addrForm.fullName.trim()) e.fullName = 'Full name is required';
    if (!isValidPhone(addrForm.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!addrForm.line1.trim()) e.line1 = 'Address line is required';
    if (!addrForm.city.trim()) e.city = 'City is required';
    if (!addrForm.state.trim()) e.state = 'State is required';
    if (!isValidPincode(addrForm.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setAddrErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveAddress = async () => {
    if (!validateAddr()) return;
    setAddrSaving(true);
    try {
      const payload = {
        fullName: addrForm.fullName.trim(),
        phone: addrForm.phone.trim(),
        line1: addrForm.line1.trim(),
        line2: addrForm.line2.trim() || undefined,
        city: addrForm.city.trim(),
        state: addrForm.state.trim(),
        pincode: addrForm.pincode.trim(),
        isDefault: addrForm.isDefault,
      };
      const saved = editing
        ? await checkoutApi.addresses.update(editing.id, payload)
        : await checkoutApi.addresses.create(payload);
      const addrs = editing ? addresses.map((a) => (a.id === saved.id ? saved : a)) : [...addresses, saved];
      setAddresses(addrs);
      if (!editing || saved.isDefault) setSelectedAddr(saved.id);
      setAddrModal(false);
    } catch (err) {
      setAddrErrors({ form: apiErrorMessage(err, 'Could not save address') });
    } finally {
      setAddrSaving(false);
    }
  };

  const discount = couponInfo?.ok ? couponInfo.discount : 0;

  const placeOrder = async () => {
    setError('');
    if (!selectedAddr) {
      setError('Please add and select a delivery address.');
      return;
    }
    setPlacing(true);
    try {
      const result = await checkoutApi.placeOrder({
        addressId: selectedAddr,
        couponCode: couponInfo?.ok ? couponInfo.code : undefined,
        paymentMethod,
        customerNotes: notes || undefined,
      });
      const { order, payment } = result;

      // Gateway created the Razorpay order but our second call failed, or the
      // gateway was down during checkout — order exists, pay from orders page.
      if (payment?.retryable) {
        setError(payment.message || 'Online payment is not available right now. Your order was placed — please pay from your orders page.');
        fetchCart();
        navigate(`/account/orders/${order.id}`);
        return;
      }

      if (paymentMethod === 'razorpay' && razorpayOn && razorpayKey) {
        try {
          await loadRazorpayScript();
          // Use the Razorpay order created during checkout (single order, exact paise amount).
          // Fall back to a fresh order only if checkout didn't create one.
          const rp = payment?.razorpayOrderId
            ? {
                keyId: payment.keyId || razorpayKey,
                amount: payment.amount,
                currency: 'INR',
                razorpayOrderId: payment.razorpayOrderId,
              }
            : await checkoutApi.razorpayOrder(order.id);
          const rzp = new window.Razorpay({
            key: rp.keyId || razorpayKey,
            amount: rp.amount, // paise — must exactly match the Razorpay order
            currency: rp.currency || 'INR',
            name: 'ShopKart',
            description: `Order ${order.order_number}`,
            order_id: rp.razorpayOrderId,
            handler: async (resp) => {
              try {
                await checkoutApi.razorpayVerify({
                  orderId: order.id,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                });
              } catch { /* order still created; payment verified later */ }
              fetchCart();
              navigate(`/order-success/${order.order_number}`);
            },
            modal: { ondismiss: () => navigate(`/account/orders/${order.id}`) },
            theme: { color: '#2549eb' },
          });
          rzp.open();
          return;
        } catch {
          setError('Could not start Razorpay payment. The order was placed — pay from your orders page.');
          fetchCart();
          navigate(`/account/orders/${order.id}`);
          return;
        }
      }

      fetchCart();
      navigate(`/order-success/${order.order_number}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not place order. Please try again.'));
    } finally {
      setPlacing(false);
    }
  };

  if (stepLoading) return <Loader fullPage />;
  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState title="Your cart is empty" description="Add some products before checking out." action={<Link to="/products" className="btn-primary">Browse products</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Address */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">1. Delivery Address</h2>
              <Button variant="outline" onClick={() => openAddrModal(null)}>+ Add New</Button>
            </div>
            {addresses.length === 0 && <p className="mt-3 text-sm text-gray-500">No addresses saved yet. Add one to continue.</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label key={a.id} className={`cursor-pointer rounded-xl border-2 p-4 text-sm ${selectedAddr === a.id ? 'border-brand-600 bg-brand-50/50' : 'border-sk-mist-2 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="address" checked={selectedAddr === a.id} onChange={() => setSelectedAddr(a.id)} className="mt-1 h-4 w-4 text-brand-600" />
                    <div className="flex-1">
                      <p className="font-bold">{a.full_name} <span className="font-normal text-gray-500">{a.phone}</span></p>
                      <p className="mt-1 text-gray-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}</p>
                      {a.isDefault && <span className="badge mt-1 bg-brand-100 text-brand-800">Default</span>}
                      <button type="button" onClick={(e) => { e.preventDefault(); openAddrModal(a); }} className="link mt-1 text-xs">Edit</button>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="card p-5">
            <h2 className="text-lg font-bold">2. Payment Method</h2>
            <div className="mt-3 space-y-3">
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${paymentMethod === 'cod' ? 'border-brand-600 bg-brand-50/50' : 'border-sk-mist-2'}`}>
                <input type="radio" name="pm" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="mt-1 h-4 w-4 text-brand-600" />
                <div>
                  <p className="font-bold">Cash on Delivery</p>
                  <p className="text-sm text-gray-500">Pay in cash or UPI when your order arrives. No advance needed.</p>
                </div>
              </label>
              {razorpayOn && razorpayKey ? (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${paymentMethod === 'razorpay' ? 'border-brand-600 bg-brand-50/50' : 'border-sk-mist-2'}`}>
                  <input type="radio" name="pm" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="mt-1 h-4 w-4 text-brand-600" />
                  <div>
                    <p className="font-bold">Pay Online</p>
                    <p className="text-sm text-gray-500">UPI, credit/debit cards, net banking and wallets via Razorpay.</p>
                  </div>
                </label>
              ) : (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Online payments (UPI, cards, net banking) will be enabled here once the store connects its payment gateway. For now, Cash on Delivery is available.
                </p>
              )}
            </div>
            <div className="mt-4">
              <label className="label">Order notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} placeholder="Anything we should know about delivery?" />
            </div>
          </section>
        </div>

        {/* Summary */}
        <div>
          <div className="card sticky top-32 space-y-4 p-5">
            <h2 className="text-lg font-bold">Order Summary</h2>
            <div className="max-h-56 space-y-3 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <img src={imageUrl(item.product.primaryImage)} alt={item.product.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Qty {item.qty}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="flex gap-2">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="input uppercase" />
                <Button variant="outline" onClick={() => applyCoupon()} loading={couponLoading}>Apply</Button>
              </div>
              {couponInfo?.ok && <p className="mt-1.5 text-sm font-semibold text-green-700">{couponInfo.code} — save {formatPrice(couponInfo.discount)}</p>}
              {couponInfo && !couponInfo.ok && <p className="mt-1.5 text-sm text-red-600">{couponInfo.message}</p>}
            </div>

            <dl className="space-y-2 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-medium">{formatPrice(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Discount</dt><dd className="font-medium text-green-700">− {formatPrice(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd className="font-medium">Calculated on order</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">GST</dt><dd className="font-medium">Included in total</dd></div>
            </dl>

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <Button className="w-full" onClick={placeOrder} loading={placing}>
              {paymentMethod === 'cod' ? 'Place Order' : 'Pay & Place Order'}
            </Button>
            <p className="text-center text-xs text-gray-400">By placing this order you agree to our Terms & Conditions.</p>
          </div>
        </div>
      </div>

      <Modal open={addrModal} onClose={() => setAddrModal(false)} title={editing ? 'Edit Address' : 'Add Address'} footer={
        <>
          <Button variant="secondary" onClick={() => setAddrModal(false)}>Cancel</Button>
          <Button onClick={saveAddress} loading={addrSaving}>Save Address</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={addrForm.fullName} onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })} error={addrErrors.fullName} />
          <Input label="Phone" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={addrErrors.phone} inputMode="numeric" />
          <Input label="Address line 1" value={addrForm.line1} onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })} error={addrErrors.line1} className="sm:col-span-2" />
          <Input label="Address line 2 (optional)" value={addrForm.line2} onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })} className="sm:col-span-2" />
          <Input label="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} error={addrErrors.city} />
          <Input label="State" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} error={addrErrors.state} />
          <Input label="Pincode" value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} error={addrErrors.pincode} inputMode="numeric" className="sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="h-4 w-4 text-brand-600" />
            Make this my default address
          </label>
          {addrErrors.form && <p className="text-sm text-red-600 sm:col-span-2">{addrErrors.form}</p>}
        </div>
      </Modal>
    </div>
  );
}
