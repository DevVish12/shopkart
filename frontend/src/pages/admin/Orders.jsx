import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import { onRealtime } from '../../realtime/socket.js';
import { formatPrice, formatDate, statusLabel, statusBadgeColor } from '../../utils/formatPrice.js';

const STATUSES = ['', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'];

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, status, search });
      const r = await api.get(`/admin/orders?${params.toString()}`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // Live updates — new orders and status changes appear without reload.
    const offCreated = onRealtime('order:created', ({ order }) => {
      setRows((prev) => {
        if (prev.some((r) => r.id === order.id)) return prev;
        return [order, ...prev];
      });
    });
    const offStatus = onRealtime('order:status', ({ orderId, status: st }) => {
      setRows((prev) => prev.map((r) => (r.id === orderId ? { ...r, order_status: st } : r)));
    });
    return () => { offCreated(); offStatus(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { key: 'order_number', label: 'Order', render: (r) => <Link to={`/admin/orders/${r.id}`} className="link font-semibold">{r.order_number}</Link> },
    { key: 'customer', label: 'Customer', render: (r) => <span>{r.customer_name || r.user_name || '—'}</span> },
    { key: 'items', label: 'Items', render: (r) => r.itemCount ?? '—' },
    { key: 'grand_total', label: 'Total', render: (r) => <span className="font-semibold">{formatPrice(r.grand_total)}</span> },
    { key: 'payment', label: 'Payment', render: (r) => (
      <span className="text-xs">{r.payment_method}{r.payment_status ? ` · ${r.payment_status}` : ''}</span>
    )},
    { key: 'order_status', label: 'Status', render: (r) => <span className={`badge ${statusBadgeColor(r.order_status)}`}>{statusLabel(r.order_status)}</span> },
    { key: 'created_at', label: 'Placed', render: (r) => <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">Orders</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Live
        </span>
      </div>
      <div className="card mt-5 flex flex-wrap gap-3 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} placeholder="Search order no. or customer…" className="input max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === '' ? 'All statuses' : statusLabel(s)}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => load(1)}>Filter</Button>
      </div>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => { load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
    </div>
  );
}
