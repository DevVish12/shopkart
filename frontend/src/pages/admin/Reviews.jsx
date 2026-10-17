import React, { useEffect, useState } from 'react';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatDate, statusBadgeColor } from '../../utils/formatPrice.js';
import { onRealtime } from '../../realtime/socket.js';
import { useToast } from '../../components/common/Toast.jsx';

export default function Reviews() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/reviews?page=${page}&status=${status}`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // Live — new customer reviews appear instantly.
    const off = onRealtime('review:created', ({ review }) => {
      setRows((prev) => (prev.some((r) => r.id === review.id) ? prev : [review, ...prev]));
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const moderate = async (row, action) => {
    setBusy(row.id);
    try {
      await api.put(`/admin/reviews/${row.id}/${action}`);
      load(1);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/reviews/${deleting.id}`);
      setDeleting(null);
      load(1);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'review', label: 'Review', render: (r) => (
      <div className="max-w-md">
        <div className="flex items-center gap-2">
          <span className="badge bg-amber-100 text-amber-800">{r.rating} ★</span>
          {r.title && <span className="font-semibold">{r.title}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.comment || '—'}</p>
        <p className="mt-1 text-xs text-gray-400">by {r.user_name || r.userName || 'Customer'} · {r.product_name ? `on ${r.product_name} · ` : ''}{formatDate(r.created_at)}</p>
        {r.images?.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {r.images.map((img) => (
              <img key={img.id} src={imageUrl(img.image_url)} alt="" className="h-10 w-10 rounded object-cover" />
            ))}
          </div>
        )}
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${statusBadgeColor(r.status)}`}>{r.status}</span> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2 whitespace-nowrap">
        {r.status !== 'approved' && (
          <button disabled={busy === r.id} onClick={() => moderate(r, 'approve')} className="text-xs font-medium text-green-600 hover:text-green-800">Approve</button>
        )}
        {r.status !== 'rejected' && (
          <button disabled={busy === r.id} onClick={() => moderate(r, 'reject')} className="text-xs font-medium text-amber-600 hover:text-amber-800">Reject</button>
        )}
        <button onClick={() => setDeleting(r)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Review Moderation</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <p className="mt-1 text-sm text-gray-500">Only approved reviews appear on the storefront.</p>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => load(p)} />}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Delete review?" message="This review will be permanently removed." />
    </div>
  );
}
