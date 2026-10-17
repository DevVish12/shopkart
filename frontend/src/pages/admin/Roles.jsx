import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import { useAdminAuth } from '../../routes/AdminRoute.jsx';
import { useToast } from '../../components/common/Toast.jsx';

export default function Roles() {
  const { can } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/roles');
      setRows(r.data.data?.roles || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/roles/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Role',
      render: (r) => (
        <div>
          <span className="font-medium">{r.name}</span>
          {r.is_system ? (
            <span className="badge ml-2 bg-brand-100 text-brand-800">System</span>
          ) : null}
          {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', render: (r) => <code className="text-xs text-gray-500">{r.slug}</code> },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (r) => <span className="text-sm text-gray-600">{(r.permissions || []).length} granted</span>,
    },
    {
      key: 'admins',
      label: 'Team members',
      render: (r) => <span className="text-sm text-gray-600">{r.admins_count ?? '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-2 whitespace-nowrap">
          {can('roles.edit') && (
            <Link to={`/admin/roles/${r.id}/edit`} className="link text-xs">Edit</Link>
          )}
          {can('roles.delete') && !r.is_system && (
            <button onClick={() => setDeleting(r)} className="text-xs font-medium text-red-600 hover:text-red-800">
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Roles</h1>
        {can('roles.create') && (
          <Link to="/admin/roles/new"><Button>+ New Role</Button></Link>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Create roles and choose exactly which parts of the admin panel each role can access.
        System roles cannot be deleted.
      </p>
      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={delLoading}
        title="Delete role?"
        message={`Delete the "${deleting?.name}" role? This only works when no team member uses it.`}
      />
    </div>
  );
}
