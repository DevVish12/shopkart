import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatPrice, statusBadgeColor } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY = { name: '', pincodes: '', charge: '', free_above: '', estimated_days: '', status: 'active' };

export default function Shipping() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/shipping/zones');
      const d = r.data.data;
      setRows(Array.isArray(d) ? d : d?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = (row) => {
    setEditing(row || null);
    setForm(row ? {
      name: row.name, pincodes: row.pincodes || '', charge: row.charge ?? '',
      free_above: row.free_above ?? '', estimated_days: row.estimated_days || '', status: row.status,
    } : EMPTY);
    setError('');
    setModal(true);
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Zone name is required.');
    if (form.charge === '' || Number(form.charge) < 0) return setError('Enter a valid shipping charge.');
    if (!form.estimated_days.trim()) return setError('Estimated delivery time is required.');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        pincodes: form.pincodes.trim(),
        charge: Number(form.charge),
        free_above: form.free_above === '' ? null : Number(form.free_above),
        estimated_days: form.estimated_days.trim(),
        status: form.status,
      };
      if (editing) await api.put(`/admin/shipping/zones/${editing.id}`, payload);
      else await api.post('/admin/shipping/zones', payload);
      setModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await api.put(`/admin/shipping/zones/${row.id}/status`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/shipping/zones/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Zone', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'pincodes', label: 'Pincodes', render: (r) => <span className="line-clamp-2 max-w-xs text-xs text-gray-500">{r.pincodes || 'Default (all others)'}</span> },
    { key: 'charge', label: 'Charge', render: (r) => formatPrice(r.charge) },
    { key: 'free_above', label: 'Free Above', render: (r) => (r.free_above ? formatPrice(r.free_above) : '—') },
    { key: 'estimated_days', label: 'ETA', render: (r) => r.estimated_days },
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
        <h1 className="text-2xl font-extrabold">Shipping Zones</h1>
        <Button onClick={() => open(null)}>+ Add Zone</Button>
      </div>
      <p className="mt-1 text-sm text-gray-500">Define delivery charges and free-shipping thresholds by pincode.</p>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>

      <AdminModal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Zone' : 'Add Zone'} onSubmit={submit} loading={saving} size="md">
        <div className="space-y-4">
          <Input label="Zone name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} hint="e.g. Metro Cities" />
          <div>
            <label className="label">Pincodes (comma separated)</label>
            <textarea value={form.pincodes} onChange={(e) => setForm({ ...form, pincodes: e.target.value })} className="input" rows={3} placeholder="400001, 400002, 110001 …" />
            <p className="mt-1 text-xs text-gray-500">Leave empty for the default zone covering all other pincodes.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Shipping charge (₹) *" type="number" min="0" step="0.01" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} />
            <Input label="Free shipping above (₹)" type="number" min="0" step="0.01" value={form.free_above} onChange={(e) => setForm({ ...form, free_above: e.target.value })} hint="Empty = never free" />
          </div>
          <Input label="Estimated delivery time *" value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} hint="e.g. 2-4 days" />
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </AdminModal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Delete zone?" message={`Delete shipping zone "${deleting?.name}"?`} />
    </div>
  );
}
