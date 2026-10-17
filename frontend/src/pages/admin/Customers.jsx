import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatPrice, formatDate, statusBadgeColor } from '../../utils/formatPrice.js';
import { onRealtime } from '../../realtime/socket.js';
import { useToast } from '../../components/common/Toast.jsx';

export default function Customers() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [blocking, setBlocking] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, search, status });
      const r = await api.get(`/admin/customers?${params.toString()}`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // Live — new registrations appear instantly.
    const off = onRealtime('user:registered', ({ user }) => {
      setRows((prev) => (prev.some((r) => r.id === user.id) ? prev : [user, ...prev]));
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBlock = async () => {
    if (!blocking) return;
    setBusy(true);
    try {
      const action = blocking.status === 'blocked' ? 'unblock' : 'block';
      await api.put(`/admin/customers/${blocking.id}/${action}`);
      setBlocking(null);
      load(1);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Customer', render: (r) => (
      <div>
        <Link to={`/admin/customers/${r.id}`} className="link font-medium">{r.name}</Link>
        <p className="text-xs text-gray-400">{r.email} · {r.phone || '—'}</p>
      </div>
    )},
    { key: 'ordersCount', label: 'Orders', render: (r) => r.ordersCount ?? 0 },
    { key: 'totalSpent', label: 'Total Spent', render: (r) => <span className="font-medium">{formatPrice(r.totalSpent)}</span> },
    { key: 'created_at', label: 'Registered', render: (r) => <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${r.status === 'blocked' ? statusBadgeColor('cancelled') : statusBadgeColor('active')}`}>{r.status}</span> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2 whitespace-nowrap">
        <Link to={`/admin/customers/${r.id}`} className="link text-xs">View</Link>
        <button onClick={() => setBlocking(r)} className={`text-xs font-medium ${r.status === 'blocked' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}>
          {r.status === 'blocked' ? 'Unblock' : 'Block'}
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <div className="card mt-5 flex flex-wrap gap-3 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} placeholder="Search name or email…" className="input max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <Button variant="secondary" onClick={() => load(1)}>Search</Button>
      </div>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => { load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}

      <ConfirmDialog
        open={!!blocking}
        onClose={() => setBlocking(null)}
        onConfirm={toggleBlock}
        loading={busy}
        danger={blocking?.status !== 'blocked'}
        title={blocking?.status === 'blocked' ? 'Unblock customer?' : 'Block customer?'}
        message={blocking?.status === 'blocked' ? `${blocking?.name} will be able to login again.` : `${blocking?.name} will no longer be able to login or order.`}
        confirmText={blocking?.status === 'blocked' ? 'Unblock' : 'Block'}
      />
    </div>
  );
}
