import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { imageUrl, apiErrorMessage } from '../../services/api.js';
import { checkoutApi } from '../../features/checkout/index.js';
import { formatPrice } from '../../utils/formatPrice.js';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Loader from '../../components/common/Loader.jsx';

export default function Cart() {
  const { cart, loading, updateQty, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [shipInfo, setShipInfo] = useState(null);
  const [shipChecking, setShipChecking] = useState(false);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const r = await checkoutApi.validateCoupon(coupon.trim().toUpperCase(), cart.subtotal);
      setCouponResult({ ok: true, discount: r.discount, code: r.coupon?.code || coupon.trim().toUpperCase() });
    } catch (err) {
      setCouponResult({ ok: false, message: apiErrorMessage(err, 'Invalid coupon') });
    } finally {
      setCouponLoading(false);
    }
  };

  const checkShip = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setShipInfo({ error: 'Enter a valid 6-digit pincode.' });
      return;
    }
    setShipChecking(true);
    try {
      const r = await checkoutApi.checkPincode(pin);
      setShipInfo(r.serviceable ? { ok: true, ...r } : { ok: false });
    } catch {
      setShipInfo({ error: 'Could not check pincode.' });
    } finally {
      setShipChecking(false);
    }
  };

  const discount = couponResult?.ok ? couponResult.discount : 0;
  const shipping = shipInfo?.ok ? (cart.subtotal - discount >= (shipInfo.freeAbove || Infinity) ? 0 : shipInfo.charge) : 0;
  const total = cart.subtotal - discount + shipping;

  if (loading) return <Loader fullPage />;

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Looks like you have not added anything yet. Explore our bestsellers and new arrivals."
          action={<Link to="/products" className="btn-primary">Continue Shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Shopping Cart ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <Link to={`/products/${item.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-sk-mist">
                <img src={imageUrl(item.product.primaryImage)} alt={item.product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.product.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-700">
                  {item.product.name}
                </Link>
                {item.variant && (item.variant.size || item.variant.color) && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-lg border border-sk-mist-2">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2.5 py-1 font-bold" aria-label="Decrease">−</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2.5 py-1 font-bold" aria-label="Increase">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold">{formatPrice(item.lineTotal)}</p>
                <p className="text-xs text-gray-400">{formatPrice(item.price)} each</p>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button onClick={clearCart} className="text-sm font-medium text-red-600 hover:text-red-800">Clear cart</button>
            <Link to="/products" className="link text-sm">← Continue shopping</Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold">Apply Coupon</h3>
            <div className="mt-2 flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="input uppercase" />
              <Button variant="outline" onClick={applyCoupon} loading={couponLoading}>Apply</Button>
            </div>
            {couponResult?.ok && <p className="mt-2 text-sm font-semibold text-green-700">Coupon {couponResult.code} applied — you save {formatPrice(couponResult.discount)}.</p>}
            {couponResult && !couponResult.ok && <p className="mt-2 text-sm text-red-600">{couponResult.message}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-bold">Delivery Pincode</h3>
            <div className="mt-2 flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" className="input" inputMode="numeric" />
              <Button variant="outline" onClick={checkShip} loading={shipChecking}>Check</Button>
            </div>
            {shipInfo?.ok && (
              <p className="mt-2 text-sm text-green-700">
                {shipInfo.estimatedDays} delivery · {shipping === 0 ? 'FREE shipping' : `shipping ${formatPrice(shipping)}`}
                {shipInfo.freeAbove > 0 && shipping > 0 && ` · free above ${formatPrice(shipInfo.freeAbove)}`}
              </p>
            )}
            {shipInfo && !shipInfo.ok && !shipInfo.error && <p className="mt-2 text-sm text-red-600">Not serviceable yet.</p>}
            {shipInfo?.error && <p className="mt-2 text-sm text-red-600">{shipInfo.error}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-bold">Price Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-medium">{formatPrice(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Coupon discount</dt><dd className="font-medium text-green-700">− {formatPrice(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd className="font-medium">{shipping === 0 ? <span className="text-green-700">FREE</span> : formatPrice(shipping)}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold">{formatPrice(total)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-gray-400">Taxes are calculated at checkout based on your delivery address.</p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login', { state: { from: '/checkout' } });
                  return;
                }
                navigate('/checkout', { state: couponResult?.ok ? { couponCode: couponResult.code } : undefined });
              }}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
