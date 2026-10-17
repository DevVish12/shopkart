import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';
import DataTable from '../../components/admin/DataTable.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatPrice, formatDate } from '../../utils/formatPrice.js';
import { useToast } from '../../components/common/Toast.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [group, setGroup] = useState('day');
  const [prodType, setProdType] = useState('best_sellers');
  const [custType, setCustType] = useState('top');
  const [rows, setRows] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      let path = '';
      if (tab === 'sales') path = `/admin/reports/sales?from=${from}&to=${to}&group=${group}`;
      if (tab === 'products') path = `/admin/reports/products?type=${prodType}`;
      if (tab === 'customers') path = `/admin/reports/customers?type=${custType}`;
      const r = await api.get(path);
      setRows(r.data.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, prodType, custType]);

  const downloadCsv = () => {
    let path = '';
    if (tab === 'sales') path = `/admin/reports/sales?from=${from}&to=${to}&group=${group}`;
    if (tab === 'products') path = `/admin/reports/products?type=${prodType}`;
    if (tab === 'customers') path = `/admin/reports/customers?type=${custType}`;
    // token via query param only for direct download; backend also accepts Authorization header,
    // so we fetch as blob with the header instead.
    api
      .get(`${path}&format=csv`, { responseType: 'blob' })
      .then((r) => {
        const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tab}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Could not download the CSV.'));
  };

  const columns =
    tab === 'sales'
      ? [
          { key: 'period', label: 'Period', render: (r) => r.period },
          { key: 'orders', label: 'Orders', render: (r) => r.orders },
          { key: 'revenue', label: 'Revenue', render: (r) => <span className="font-semibold">{formatPrice(r.revenue)}</span> },
        ]
      : tab === 'products'
        ? [
            { key: 'name', label: 'Product', render: (r) => r.name },
            { key: 'qty', label: 'Qty Sold', render: (r) => r.qty ?? '—' },
            { key: 'stock', label: 'Stock', render: (r) => r.stock ?? '—' },
            { key: 'revenue', label: 'Revenue', render: (r) => (r.revenue != null ? formatPrice(r.revenue) : '—') },
          ]
        : [
            { key: 'name', label: 'Customer', render: (r) => <span><span className="font-medium">{r.name}</span><br /><span className="text-xs text-gray-400">{r.email}</span></span> },
            { key: 'orders', label: 'Orders', render: (r) => r.ordersCount ?? r.orders ?? '—' },
            { key: 'spent', label: 'Total Spent', render: (r) => (r.totalSpent != null ? <span className="font-semibold">{formatPrice(r.totalSpent)}</span> : '—') },
            { key: 'created_at', label: 'Registered', render: (r) => (r.created_at ? formatDate(r.created_at) : '—') },
          ];

  const tabs = [
    ['sales', 'Sales Report'],
    ['products', 'Product Report'],
    ['customers', 'Customer Report'],
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="card mt-4 flex flex-wrap items-end gap-3 p-4">
        {tab === 'sales' && (
          <>
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="label">Group by</label>
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="input">
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </>
        )}
        {tab === 'products' && (
          <div>
            <label className="label">Report type</label>
            <select value={prodType} onChange={(e) => setProdType(e.target.value)} className="input">
              <option value="best_sellers">Best sellers</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
        )}
        {tab === 'customers' && (
          <div>
            <label className="label">Report type</label>
            <select value={custType} onChange={(e) => setCustType(e.target.value)} className="input">
              <option value="new">New customers</option>
              <option value="repeat">Repeat customers</option>
              <option value="top">Top customers</option>
            </select>
          </div>
        )}
        <Button variant="secondary" onClick={load}>Apply</Button>
        <Button variant="outline" onClick={downloadCsv}>Export CSV</Button>
      </div>

      <div className="mt-4">{loading ? <Loader /> : <DataTable columns={columns} rows={rows} />}</div>
    </div>
  );
}

export { today };
