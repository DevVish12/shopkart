import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import StatsCard from '../../components/admin/StatsCard.jsx';
import { formatPrice, formatDate, statusLabel, statusBadgeColor } from '../../utils/formatPrice.js';

export default function CustomerDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/customers/${id}`)
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (!data?.customer) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Customer not found</h1>
        <Link to="/admin/customers" className="btn-primary mt-6 inline-flex">Back to customers</Link>
      </div>
    );
  }

  const { customer, addresses, orders, stats } = data;

  return (
    <div>
      <Link to="/admin/customers" className="link text-sm">← Back to customers</Link>
      <div className="mt-2 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-700">
          {customer.name?.charAt(0)?.toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">{customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.email} · {customer.phone || '—'} · since {formatDate(customer.created_at)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Orders" value={stats?.ordersCount ?? 0} color="blue" />
        <StatsCard title="Total Spent" value={formatPrice(stats?.totalSpent)} color="green" />
        <StatsCard title="Addresses" value={addresses?.length ?? 0} color="purple" />
        <StatsCard title="Status" value={customer.status} color={customer.status === 'blocked' ? 'red' : 'green'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Order History</h2>
          <div className="mt-3 space-y-2">
            {(orders || []).map((o) => (
              <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50">
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(o.grand_total)}</p>
                  <span className={`badge ${statusBadgeColor(o.order_status)}`}>{statusLabel(o.order_status)}</span>
                </div>
              </Link>
            ))}
            {(orders || []).length === 0 && <p className="py-4 text-center text-sm text-gray-400">No orders yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">Saved Addresses</h2>
          <div className="mt-3 space-y-2">
            {(addresses || []).map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-semibold">{a.full_name} <span className="font-normal text-gray-500">{a.phone}</span></p>
                <p className="text-gray-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}</p>
              </div>
            ))}
            {(addresses || []).length === 0 && <p className="py-4 text-center text-sm text-gray-400">No addresses saved.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
