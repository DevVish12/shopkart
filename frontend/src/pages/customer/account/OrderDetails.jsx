import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../../features/orders/index.js';
import { checkoutApi } from '../../../features/checkout/index.js';
import { formatPrice, formatDateTime, statusLabel, statusBadgeColor } from '../../../utils/formatPrice.js';
import { imageUrl, apiErrorMessage } from '../../../services/api.js';
import Loader from '../../../components/common/Loader.jsx';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';

const TIMELINE_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
const TERMINAL = ['cancelled', 'returned', 'refunded'];

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const r = await orderApi.detail(id);
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader fullPage />;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link to="/account/orders" className="btn-primary mt-6 inline-flex">Back to orders</Link>
      </div>
    );
  }

  const { order, statusHistory } = data;
  const canCancel = ['pending', 'confirmed', 'processing'].includes(order.order_status);
  const canReturn = order.order_status === 'delivered';
  const terminal = TERMINAL.includes(order.order_status);
  const canPayOnline =
    order.payment_method !== 'cod' &&
    ['pending', 'failed'].includes(order.payment_status) &&
    !terminal;

  const payNow = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve(true);
          s.onerror = () => reject(new Error('Razorpay script failed to load'));
          document.body.appendChild(s);
        });
      }
      const rp = await checkoutApi.razorpayOrder(order.id);
      const rzp = new window.Razorpay({
        key: rp.keyId,
        amount: rp.amount,
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
            setMsg('Payment successful!');
          } catch {
            setMsg('Payment received — verification pending. It will reflect shortly.');
          }
          load();
        },
        modal: { ondismiss: () => load() },
        theme: { color: '#2549eb' },
      });
      rzp.open();
    } catch (err) {
      setMsg(apiErrorMessage(err, 'Could not start payment. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true);
    setMsg('');
    try {
      const r = await orderApi.cancel(order.id);
      setData((d) => ({ ...d, order: r.order }));
      await load();
      setCancelOpen(false);
    } catch (err) {
      setMsg(apiErrorMessage(err, 'Could not cancel the order.'));
    } finally {
      setBusy(false);
    }
  };

  const doReturn = async () => {
    if (!reason.trim()) {
      setMsg('Please tell us why you want to return this order.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await orderApi.returnRequest(order.id, reason.trim());
      await load();
      setReturnOpen(false);
      setReason('');
      setMsg('Return request submitted. We will review it shortly.');
    } catch (err) {
      setMsg(apiErrorMessage(err, 'Could not submit return request.'));
    } finally {
      setBusy(false);
    }
  };

  const currentIdx = TIMELINE_STEPS.indexOf(order.order_status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/account/orders" className="link text-sm">← Back to orders</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{order.order_number}</h1>
          <p className="text-sm text-gray-500">Placed on {formatDateTime(order.created_at)}</p>
        </div>
        <span className={`badge ${statusBadgeColor(order.order_status)} !px-3 !py-1 !text-sm`}>{statusLabel(order.order_status)}</span>
      </div>

      {/* Timeline */}
      <div className="card mt-6 p-6">
        <h2 className="font-bold">Order Timeline</h2>
        {terminal ? (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
            <p className="font-bold">{statusLabel(order.order_status)}</p>
            <p className="text-gray-500">This order is no longer in transit. See history below for details.</p>
          </div>
        ) : (
          <ol className="mt-6 flex items-center">
            {TIMELINE_STEPS.map((s, i) => {
              const done = i < currentIdx || order.order_status === 'delivered';
              const current = i === currentIdx;
              return (
                <li key={s} className={`flex-1 ${i < TIMELINE_STEPS.length - 1 ? 'pr-2' : ''}`}>
                  <div className="flex items-center">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-600 text-white' : current ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-gray-200 text-gray-500'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`h-1 w-full rounded ${i < currentIdx || done ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-medium ${current ? 'text-brand-700' : done ? 'text-gray-800' : 'text-gray-400'}`}>{statusLabel(s)}</p>
                </li>
              );
            })}
          </ol>
        )}
        {statusHistory?.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
            {[...statusHistory].reverse().map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className={`badge ${statusBadgeColor(h.status)}`}>{statusLabel(h.status)}</span>
                  {h.note && <p className="mt-1 text-gray-600">{h.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-bold">Items ({order.items?.length || 0})</h2>
            <div className="mt-3 space-y-3">
              {(order.items || []).map((it) => (
                <div key={it.id} className="flex gap-3">
                  {it.image_url && <img src={imageUrl(it.image_url)} alt={it.product_name} className="h-14 w-14 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.product_name}</p>
                    {it.variant_label && <p className="text-xs text-gray-500">{it.variant_label}</p>}
                    <p className="text-xs text-gray-500">Qty {it.qty}</p>
                  </div>
                  <p className="text-sm font-bold">{formatPrice(it.price * it.qty)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.address && (
            <div className="card p-5">
              <h2 className="font-bold">Delivery Address</h2>
              <p className="mt-2 text-sm text-gray-600">
                {order.address.full_name}, {order.address.phone}<br />
                {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city}, {order.address.state} — {order.address.pincode}
              </p>
            </div>
          )}
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">Payment Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-medium">{formatPrice(order.items_subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd className="font-medium text-green-700">− {formatPrice(order.discount_amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd className="font-medium">{Number(order.shipping_charge) === 0 ? 'FREE' : formatPrice(order.shipping_charge)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Tax (GST)</dt><dd className="font-medium">{formatPrice(order.tax_amount)}</dd></div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base"><dt className="font-bold">Grand total</dt><dd className="font-extrabold">{formatPrice(order.grand_total)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Payment</dt><dd className="font-medium">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method} · <span className={`badge ${statusBadgeColor(order.payment_status)}`}>{order.payment_status}</span></dd></div>
            {order.tracking_number && <div className="flex justify-between"><dt className="text-gray-500">Tracking no.</dt><dd className="font-mono text-sm">{order.tracking_number}</dd></div>}
          </dl>

          <div className="mt-4 space-y-2">
            {canPayOnline && (
              <Button className="w-full" onClick={payNow} loading={busy}>Pay Now — {formatPrice(order.grand_total)}</Button>
            )}
            {canCancel && <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}>Cancel Order</Button>}
            {canReturn && <Button variant="outline" className="w-full" onClick={() => setReturnOpen(true)}>Request Return</Button>}
            {msg && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{msg}</p>}
          </div>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" footer={
        <>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep Order</Button>
          <Button variant="danger" onClick={doCancel} loading={busy}>Yes, Cancel</Button>
        </>
      }>
        <p className="text-sm text-gray-600">The order will be cancelled and stock will be restored. If you already paid, the refund will be processed to your original payment method.</p>
      </Modal>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Request a return" footer={
        <>
          <Button variant="secondary" onClick={() => setReturnOpen(false)}>Close</Button>
          <Button onClick={doReturn} loading={busy}>Submit Request</Button>
        </>
      }>
        <label className="label">Reason for return</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input" rows={4} placeholder="e.g. Size does not fit / product arrived damaged" />
      </Modal>
    </div>
  );
}
