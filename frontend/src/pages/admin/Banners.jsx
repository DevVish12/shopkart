import React, { useEffect, useState } from 'react';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatDate, statusBadgeColor } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY = { title: '', subtitle: '', image: null, button_text: '', button_link: '', coupon_code: '', position: 'home_hero', sort_order: 0, starts_at: '', ends_at: '', status: 'active' };

export default function Banners() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/banners');
      setRows(r.data.data || []);
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
      title: row.title, subtitle: row.subtitle || '', image: null, button_text: row.button_text || '', button_link: row.button_link || '', coupon_code: row.coupon_code || '',
      position: row.position || 'home_hero', sort_order: row.sort_order ?? 0,
      starts_at: row.starts_at ? new Date(row.starts_at).toISOString().slice(0, 16) : '',
      ends_at: row.ends_at ? new Date(row.ends_at).toISOString().slice(0, 16) : '',
      status: row.status,
    } : EMPTY);
    setPreview(row?.image || '');
    setError('');
    setModal(true);
  };

  const submit = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!editing && !form.image) return setError('Banner image is required.');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'image') {
          if (v) fd.append('image', v);
          return;
        }
        if (v === '' || v === null) return;
        fd.append(k, v);
      });
      if (editing) await api.put(`/admin/banners/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
      await api.put(`/admin/banners/${row.id}/status`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/banners/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'banner', label: 'Banner', render: (r) => (
      <div className="flex items-center gap-3">
        <img src={imageUrl(r.image)} alt="" className="h-12 w-24 rounded-lg object-cover" />
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-gray-400">{r.position} · order {r.sort_order}</p>
        </div>
      </div>
    )},
    { key: 'button', label: 'CTA', render: (r) => (<span className="text-sm">{r.button_text ? <>{r.button_text} → {r.button_link}</> : <span className="text-gray-400">—</span>}{r.coupon_code && <span className="ml-2 rounded-md border border-dashed border-sk-primary bg-sk-mist px-1.5 py-0.5 font-mono text-xs font-bold text-sk-primary">{r.coupon_code}</span>}</span>) },
    { key: 'dates', label: 'Active Period', render: (r) => <span className="text-xs text-gray-500">{r.starts_at ? formatDate(r.starts_at) : 'Always'} — {r.ends_at ? formatDate(r.ends_at) : 'Always'}</span> },
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
        <h1 className="text-2xl font-extrabold">Banners</h1>
        <Button onClick={() => open(null)}>+ Add Banner</Button>
      </div>
      <p className="mt-1 text-sm text-gray-500">Homepage hero banners — change them here without touching code.</p>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>

      <AdminModal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Banner' : 'Add Banner'} onSubmit={submit} loading={saving} size="md">
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <div>
            <label className="label">Image {!editing && '*'}</label>
            <input type="file" accept="image/*" onChange={(e) => { setForm({ ...form, image: e.target.files[0] }); setPreview(URL.createObjectURL(e.target.files[0])); }} className="input" />
            {preview && <img src={preview.startsWith('blob:') ? preview : imageUrl(preview)} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Button text" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
            <Input label="Button link" value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} hint="e.g. /products" />
            <Input label="Coupon code (optional)" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} hint="Shown big on the hero, boAt style — e.g. FESTIVE2000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Position</label>
              <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input">
                <option value="home_hero">Home hero (slider)</option>
                <option value="home_promo">Home promo cards (3 tiles below hero)</option>
              </select>
            </div>
            <Input label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Starts at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            <Input label="Ends at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
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

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Delete banner?" message={`Delete "${deleting?.title}"?`} />
    </div>
  );
}
