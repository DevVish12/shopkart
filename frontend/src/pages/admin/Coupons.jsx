import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatPrice, formatDate, statusBadgeColor } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY = { code: '', type: 'percentage', value: '', min_order_amount: 0, max_discount: '', usage_limit: '', first_order_only: false, applicable_products: '', applicable_categories: '', starts_at: '', ends_at: '', status: 'active' };

export default function Coupons() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/coupons?page=${page}&limit=20`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const open = (row) => {
    setEditing(row || null);
    setForm(row ? {
      code: row.code, type: row.type, value: row.value, min_order_amount: row.min_order_amount ?? 0,
      max_discount: row.max_discount ?? '', usage_limit: row.usage_limit ?? '', first_order_only: !!row.first_order_only,
      applicable_products: Array.isArray(row.applicable_products) ? row.applicable_products.join(',') : (row.applicable_products || ''),
      applicable_categories: Array.isArray(row.applicable_categories) ? row.applicable_categories.join(',') : (row.applicable_categories || ''),
      starts_at: row.starts_at ? new Date(row.starts_at).toISOString().slice(0, 16) : '',
      ends_at: row.ends_at ? new Date(row.ends_at).toISOString().slice(0, 16) : '',
      status: row.status,
    } : EMPTY);
    setError('');
    setModal(true);
  };

  const submit = async () => {
    setError('');
    if (!form.code.trim()) return setError('Coupon code is required.');
    if (form.value === '' || Number(form.value) <= 0) return setError('Enter a valid discount value.');
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount: form.max_discount === '' ? null : Number(form.max_discount),
        usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
        first_order_only: form.first_order_only ? 1 : 0,
        applicable_products: form.applicable_products.trim() ? form.applicable_products.split(',').map((x) => Number(x.trim())).filter(Boolean) : null,
        applicable_categories: form.applicable_categories.trim() ? form.applicable_categories.split(',').map((x) => Number(x.trim())).filter(Boolean) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        status: form.status,
      };
      if (editing) await api.put(`/admin/coupons/${editing.id}`, payload);
      else await api.post('/admin/coupons', payload);
      setModal(false);
      load(1);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await api.put(`/admin/coupons/${row.id}/status`);
      load(1);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/coupons/${deleting.id}`);
      setDeleting(null);
      load(1);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Code', render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    { key: 'type', label: 'Discount', render: (r) => <span>{r.type === 'percentage' ? `${r.value}%` : formatPrice(r.value)}{r.max_discount ? ` (up to ${formatPrice(r.max_discount)})` : ''}</span> },
    { key: 'min', label: 'Min. Order', render: (r) => formatPrice(r.min_order_amount) },
    { key: 'usage', label: 'Usage', render: (r) => `${r.used_count ?? 0}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
    { key: 'ends_at', label: 'Expires', render: (r) => (r.ends_at ? formatDate(r.ends_at) : 'Never') },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${statusBadgeColor(r.status)}`}>{r.status}</span> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2 whitespace-nowrap">
        <button onClick={() => open(r)} className="link text-xs">Edit</button>
        <button onClick={() => toggleStatus(r)} className="link text-xs">{r.status === 'active' ? 'Disable' : 'Enable'}</button>
        <button onClick={() => setDeleting(r)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Coupons</h1>
        <Button onClick={() => open(null)}>+ Add Coupon</Button>
      </div>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => load(p)} />}

      <AdminModal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'} onSubmit={submit} loading={saving} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Coupon code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} hint="e.g. WELCOME10" />
          <div>
            <label className="label">Discount type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat (₹)</option>
            </select>
          </div>
          <Input label={form.type === 'percentage' ? 'Value (%) *' : 'Value (₹) *'} type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <Input label="Minimum order amount (₹)" type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
          <Input label="Maximum discount cap (₹)" type="number" min="0" step="0.01" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} hint="Percentage coupons only" />
          <Input label="Usage limit (total)" type="number" min="0" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} hint="Leave empty for unlimited" />
          <Input label="Starts at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <Input label="Expires at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          <Input label="Applicable product IDs (comma separated)" value={form.applicable_products} onChange={(e) => setForm({ ...form, applicable_products: e.target.value })} hint="Empty = all products" />
          <Input label="Applicable category IDs (comma separated)" value={form.applicable_categories} onChange={(e) => setForm({ ...form, applicable_categories: e.target.value })} hint="Empty = all categories" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
            First-order only
          </label>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
        </div>
      </AdminModal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Delete coupon?" message={`Delete coupon "${deleting?.code}"?`} />
    </div>
  );
}
