import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatPrice, formatDateTime, statusLabel, statusBadgeColor } from '../../utils/formatPrice.js';

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'];

export default function OrderDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState('');
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const r = await api.get(`/admin/orders/${id}`);
      const o = r.data.data.order || r.data.data;
      setOrder(o);
      setNewStatus(o.order_status);
      setTracking(o.tracking_number || '');
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changeStatus = async () => {
    setSaving(true);
    setMsg('');
    try {
      const r = await api.put(`/admin/orders/${id}/status`, { status: newStatus, note: note || undefined });
      setOrder(r.data.data.order || order);
      setNote('');
      setMsg('Status updated.');
      load();
    } catch (err) {
      setMsg(apiErrorMessage(err, 'Could not update status.'));
    } finally {
      setSaving(false);
    }
  };

  const saveTracking = async () => {
    setTrackingSaving(true);
    setMsg('');
    try {
      await api.put(`/admin/orders/${id}/tracking`, { trackingNumber: tracking });
      setMsg('Tracking number saved.');
      load();
    } catch (err) {
      setMsg(apiErrorMessage(err));
    } finally {
      setTrackingSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!order) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link to="/admin/orders" className="btn-primary mt-6 inline-flex">Back to orders</Link>
      </div>
    );
  }

  const items = order.items || [];
  const history = order.statusHistory || order.history || [];
  const addr = order.address || {};

  return (
    <div>
      <Link to="/admin/orders" className="link text-sm">← Back to orders</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{order.order_number}</h1>
        <span className={`badge ${statusBadgeColor(order.order_status)} !px-3 !py-1 !text-sm`}>{statusLabel(order.order_status)}</span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-bold">Items</h2>
            <div className="table-wrap mt-3">
              <table className="table">
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {it.image_url && <img src={imageUrl(it.image_url)} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium">{it.product_name}</p>
                            {it.variant_label && <p className="text-xs text-gray-400">{it.variant_label}</p>}
                            {it.sku && <p className="text-xs text-gray-400">SKU: {it.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td>{it.qty}</td>
                      <td>{formatPrice(it.price)}</td>
                      <td className="font-semibold">{formatPrice(it.price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{formatPrice(order.items_subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd className="text-green-700">− {formatPrice(order.discount_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd>{formatPrice(order.shipping_charge)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Tax</dt><dd>{formatPrice(order.tax_amount)}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base"><dt className="font-bold">Grand total</dt><dd className="font-extrabold">{formatPrice(order.grand_total)}</dd></div>
            </dl>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-bold">Customer</h2>
              <p className="mt-2 text-sm">
                <span className="font-medium">{order.customer?.name || order.customer_name || '—'}</span><br />
                <span className="text-gray-500">{order.customer?.email || order.customer_email || ''}</span><br />
                <span className="text-gray-500">{order.customer?.phone || ''}</span>
              </p>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Delivery Address</h2>
              <p className="mt-2 text-sm text-gray-600">
                {addr.full_name ? <>{addr.full_name}, {addr.phone}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} — {addr.pincode}</> : '—'}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">Payment</h2>
            <p className="mt-2 text-sm text-gray-600">
              Method: <span className="font-medium">{order.payment_method}</span> · Status: <span className={`badge ${statusBadgeColor(order.payment_status)}`}>{order.payment_status}</span>
            </p>
            {order.customer_notes && <p className="mt-2 text-sm text-gray-500">Notes: {order.customer_notes}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-bold">Update Status</h2>
            <div className="mt-3 space-y-3">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Handed to courier" />
              <Button className="w-full" onClick={changeStatus} loading={saving}>Update Status</Button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">Tracking Number</h2>
            <div className="mt-3 flex gap-2">
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Courier AWB no." className="input" />
              <Button variant="outline" onClick={saveTracking} loading={trackingSaving}>Save</Button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">Status History</h2>
            <div className="mt-3 space-y-3">
              {[...history].reverse().map((h) => (
                <div key={h.id} className="border-l-2 border-brand-200 pl-3 text-sm">
                  <span className={`badge ${statusBadgeColor(h.status)}`}>{statusLabel(h.status)}</span>
                  {h.note && <p className="mt-1 text-gray-600">{h.note}</p>}
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(h.created_at)}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-gray-400">No history yet.</p>}
            </div>
          </div>

          {msg && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
