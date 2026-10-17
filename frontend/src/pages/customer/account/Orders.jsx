import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../../features/orders/index.js';
import { formatPrice, formatDate, statusLabel, statusBadgeColor } from '../../../utils/formatPrice.js';
import { imageUrl } from '../../../services/api.js';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import { onRealtime } from '../../../realtime/socket.js';

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('');

  const load = async (page = 1, st = status) => {
    setLoading(true);
    try {
      const r = await orderApi.list({ page, status: st });
      setOrders(Array.isArray(r.data) ? r.data : []);
      setPagination(r.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, status);
    // Live status updates — no reload needed.
    const off = onRealtime('order:status', ({ orderId, status: st }) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: st } : o)));
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (loading && orders.length === 0) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">My Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto" aria-label="Filter by status">
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'].map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="mt-6">
          <EmptyState title="No orders yet" description="Your orders will appear here once you shop." action={<Link to="/products" className="btn-primary">Start Shopping</Link>} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((o) => (
            <Link key={o.id} to={`/account/orders/${o.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
              {o.primaryImage && <img src={imageUrl(o.primaryImage)} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.order_number}</p>
                <p className="text-sm text-gray-500">{o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {formatDate(o.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(o.grand_total)}</p>
                <span className={`badge mt-1 ${statusBadgeColor(o.order_status)}`}>{statusLabel(o.order_status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => { load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
    </div>
  );
}
