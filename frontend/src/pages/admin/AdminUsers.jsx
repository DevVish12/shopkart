import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminModal from '../../components/admin/AdminModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { statusBadgeColor } from '../../utils/formatPrice.js';
import { useAdminAuth } from '../../routes/AdminRoute.jsx';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY = { name: '', email: '', password: '', role_id: '', status: 'active' };

export default function AdminUsers() {
  const { admin: me, can } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
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
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/roles').catch(() => ({ data: { data: { roles: [] } } })),
      ]);
      setRows(usersRes.data.data || []);
      setRoles(rolesRes.data.data?.roles || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = (row) => {
    setEditing(row || null);
    setForm(
      row
        ? { name: row.name, email: row.email, password: '', role_id: row.role_id || '', status: row.status }
        : EMPTY
    );
    setError('');
    setModal(true);
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (!editing && !form.email.trim()) return setError('Email is required.');
    if (!editing && form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (!form.role_id) return setError('Please choose a role.');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/users/${editing.id}`, {
          name: form.name.trim(),
          role_id: Number(form.role_id),
          status: form.status,
        });
      } else {
        await api.post('/admin/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role_id: Number(form.role_id),
        });
      }
      setModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/users/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const roleLabel = (r) => r.role_name || r.role_slug || r.role || '—';

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}{r.id === me?.id ? ' (you)' : ''}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-sm text-gray-500">{r.email}</span> },
    {
      key: 'role', label: 'Role',
      render: (r) => (
        <span className={`badge ${r.role_slug === 'super-admin' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-700'}`}>
          {roleLabel(r)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${statusBadgeColor(r.status)}`}>{r.status}</span> },
    {
      key: 'actions', label: 'Actions', render: (r) => (
        <div className="flex gap-2 whitespace-nowrap">
          {can('admins.edit') && <button onClick={() => open(r)} className="link text-xs">Edit</button>}
          {can('admins.delete') && r.id !== me?.id && (
            <button onClick={() => setDeleting(r)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Team Members</h1>
        {can('admins.create') && <Button onClick={() => open(null)}>+ Add Member</Button>}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Give each team member a role from <span className="font-medium">Roles</span> — the role decides exactly what they can see and do.
      </p>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>

      <AdminModal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Team Member' : 'Add Team Member'} onSubmit={submit} loading={saving} size="md">
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
          {!editing && <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Minimum 6 characters" />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="input">
                <option value="">— Select role —</option>
                {roles.map((rl) => (
                  <option key={rl.id} value={rl.id}>{rl.name}</option>
                ))}
              </select>
            </div>
            {editing && (
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </AdminModal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={delLoading} title="Remove team member?" message={`Remove ${deleting?.name} (${deleting?.email}) from admin access?`} />
    </div>
  );
}
