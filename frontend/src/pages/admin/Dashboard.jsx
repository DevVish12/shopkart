import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import api from '../../services/api.js';
import StatsCard from '../../components/admin/StatsCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import { onRealtime } from '../../realtime/socket.js';
import { formatPrice, formatDate } from '../../utils/formatPrice.js';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = () => {
    api
      .get('/admin/reports/dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Live refresh when a new order arrives.
    const off = onRealtime('order:created', () => load());
    return off;
  }, []);

  if (loading) return <Loader />;

  const t = data?.totals || {};
  const charts = data?.charts || {};

  const cards = [
    ['Total Revenue', formatPrice(t.revenue), 'green', "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"],
    ["Today's Sales", formatPrice(t.todayRevenue), 'brand', 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'],
    ['Total Orders', t.orders ?? 0, 'blue', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'],
    ['Pending Orders', t.pendingOrders ?? 0, 'amber', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
    ['Total Customers', t.customers ?? 0, 'purple', 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'],
    ['Total Products', t.products ?? 0, 'blue', 'M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10V11m0 10l-8-4V7m8 4L4 7'],
    ['Low Stock Products', t.lowStock ?? 0, 'red', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'],
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-gray-500">Store overview for the last 30 days</p>
        </div>
        <Link to="/admin/reports" className="btn-outline">View Reports</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([title, value, color, icon]) => (
          <StatsCard key={title} title={title} value={value} color={color} icon={icon} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Revenue — Last 30 Days</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.salesByDay || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => [formatPrice(v), 'Revenue']} labelFormatter={(d) => formatDate(d)} />
                <Line type="monotone" dataKey="revenue" stroke="#2549eb" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">Orders — Last 30 Days</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.salesByDay || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => formatDate(d)} />
                <Bar dataKey="orders" fill="#93b4fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Top Products</h2>
          <ul className="mt-3 divide-y divide-gray-50">
            {(charts.topProducts || []).map((p, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-500">{p.qty} sold · {formatPrice(p.revenue)}</span>
              </li>
            ))}
            {(charts.topProducts || []).length === 0 && <li className="py-6 text-center text-sm text-gray-400">No sales data yet</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Top Categories</h2>
          <ul className="mt-3 divide-y divide-gray-50">
            {(charts.topCategories || []).map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-500">{formatPrice(c.revenue)}</span>
              </li>
            ))}
            {(charts.topCategories || []).length === 0 && <li className="py-6 text-center text-sm text-gray-400">No sales data yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
