import React, { useEffect, useState } from 'react';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { statusBadgeColor } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY = { name: '', slug: '', parent_id: '', image: null, description: '', sort_order: 0, status: 'active' };

export default function Categories() {
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
      const r = await api.get('/admin/categories');
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
    setForm(row ? { name: row.name, slug: row.slug || '', parent_id: row.parentId || '', image: null, description: row.description || '', sort_order: row.sortOrder ?? 0, status: row.status } : EMPTY);
    setPreview(row?.image || '');
    setError('');
    setModal(true);
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      if (form.slug.trim()) fd.append('slug', form.slug.trim());
      if (form.parent_id) fd.append('parent_id', form.parent_id);
      if (form.image) fd.append('image', form.image);
      fd.append('description', form.description);
      fd.append('sort_order', form.sort_order);
      fd.append('status', form.status);
      if (editing) await api.put(`/admin/categories/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
      await api.put(`/admin/categories/${row.id}/status`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/categories/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const parentName = (id) => rows.find((r) => r.id === id)?.name || '—';

  const columns = [
    { key: 'name', label: 'Category', render: (r) => (
      <div className="flex items-center gap-3">
        {r.image && <img src={imageUrl(r.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />}
        <span className="font-medium">{r.name}</span>
      </div>
    )},
    { key: 'parent', label: 'Parent', render: (r) => parentName(r.parent_id) },
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
        <h1 className="text-2xl font-extrabold">Categories</h1>
        <Button onClick={() => open(null)}>+ Add Category</Button>
      </div>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>

      <AdminModal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'} onSubmit={submit} loading={saving} size="md">
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Slug (auto-generated if empty)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} hint="URL-safe, e.g. electronics" />
          <div>
            <label className="label">Parent category</label>
            <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="input">
              <option value="">None (top-level)</option>
              {rows.filter((r) => !r.parent_id && r.id !== editing?.id).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Image</label>
            <input type="file" accept="image/*" onChange={(e) => { setForm({ ...form, image: e.target.files[0] }); setPreview(URL.createObjectURL(e.target.files[0])); }} className="input" />
            {preview && <img src={preview.startsWith('blob:') ? preview : imageUrl(preview)} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </AdminModal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Delete category?" message={`Delete "${deleting?.name}"? This fails if it has products or subcategories.`} />
    </div>
  );
}
