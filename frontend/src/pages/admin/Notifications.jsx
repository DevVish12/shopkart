import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatDateTime } from '../../utils/formatPrice.js';

const TYPES = ['order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_successful', 'payment_failed', 'offer', 'announcement'];

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ mode: 'broadcast', userId: '', type: 'announcement', title: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/notifications?page=${page}`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.message.trim()) return setError('Message is required.');
    if (form.mode === 'user' && !form.userId.trim()) return setError('Customer user ID is required for a targeted notification.');
    setSaving(true);
    try {
      const payload = form.mode === 'broadcast'
        ? { broadcast: true, type: form.type, title: form.title.trim(), message: form.message.trim() }
        : { userId: Number(form.userId), type: form.type, title: form.title.trim(), message: form.message.trim() };
      await api.post('/admin/notifications', payload);
      setModal(false);
      setForm({ mode: 'broadcast', userId: '', type: 'announcement', title: '', message: '' });
      setSuccess('Notification sent.');
      load(1);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Notification', render: (r) => (
      <div className="max-w-md">
        <p className="font-medium">{r.title}</p>
        <p className="line-clamp-2 text-sm text-gray-500">{r.message}</p>
      </div>
    )},
    { key: 'type', label: 'Type', render: (r) => <span className="badge bg-gray-100 text-gray-700">{r.type}</span> },
    { key: 'audience', label: 'Audience', render: (r) => (r.user_id ? `Customer #${r.user_id}` : 'Broadcast') },
    { key: 'created_at', label: 'Sent', render: (r) => <span className="text-xs text-gray-500">{formatDateTime(r.created_at)}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Notifications</h1>
        <Button onClick={() => setModal(true)}>+ Send Notification</Button>
      </div>
      <p className="mt-1 text-sm text-gray-500">Order events trigger notifications automatically. Send offers or announcements here.</p>
      {success && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => load(p)} />}

      <AdminModal open={modal} onClose={() => setModal(false)} title="Send Notification" onSubmit={submit} loading={saving} submitText="Send" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Audience</label>
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="input">
              <option value="broadcast">All customers (broadcast)</option>
              <option value="user">Single customer</option>
            </select>
          </div>
          {form.mode === 'user' && (
            <Input label="Customer user ID" type="number" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          )}
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="label">Message *</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" rows={4} />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </AdminModal>
    </div>
  );
}
