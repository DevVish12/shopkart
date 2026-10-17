import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import Loader from '../../components/common/Loader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import { formatPrice, statusBadgeColor } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

export default function Products() {
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20, search, status });
      const r = await api.get(`/admin/products?${params.toString()}`);
      setRows(r.data.data || []);
      setPagination(r.data.pagination || null);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = async (row) => {
    try {
      await api.put(`/admin/products/${row.id}/status`, { status: row.status === 'active' ? 'inactive' : 'active' });
      load(page);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.delete(`/admin/products/${deleting.id}`);
      setDeleting(null);
      load(page);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={imageUrl(r.primaryImage)} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <p className="max-w-[14rem] truncate font-medium">{r.name}</p>
            <p className="text-xs text-gray-400">SKU: {r.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', label: 'Price', render: (r) => <span className="font-medium">{formatPrice(r.price)}</span> },
    { key: 'stock', label: 'Stock', render: (r) => <span className={r.stock <= 5 ? 'font-bold text-red-600' : ''}>{r.stock}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${statusBadgeColor(r.status)}`}>{r.status}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-2 whitespace-nowrap">
          <Link to={`/admin/products/${r.id}/edit`} className="link text-xs">Edit</Link>
          <button onClick={() => toggleStatus(r)} className="link text-xs">{r.status === 'active' ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => setDeleting(r)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">+ Add Product</Link>
      </div>

      <div className="card mt-5 flex flex-wrap gap-3 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} placeholder="Search name or SKU…" className="input max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button variant="secondary" onClick={() => load(1)}>Search</Button>
      </div>

      <div className="mt-4">
        {loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}
      </div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => { load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={delLoading}
        title="Delete product?"
        message={`Delete "${deleting?.name}" permanently? Its images, variants and reviews will also be removed.`}
      />
    </div>
  );
}
