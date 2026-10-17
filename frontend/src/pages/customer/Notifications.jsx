import React, { useEffect, useState } from 'react';
import { notificationApi } from '../../features/orders/index.js';
import { formatDateTime } from '../../utils/formatPrice.js';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Button from '../../components/common/Button.jsx';
import Pagination from '../../components/common/Pagination.jsx';

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await notificationApi.list(page);
      setItems(Array.isArray(r.data) ? r.data : []);
      setPagination(r.pagination || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (n) => {
    if (n.isRead) return;
    try {
      await notificationApi.markRead(n.id);
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch { /* ignore */ }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    } catch { /* ignore */ }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Notifications</h1>
        {items.some((x) => !x.isRead) && (
          <Button variant="outline" onClick={markAll}>Mark all as read</Button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n)}
            className={`card w-full p-4 text-left transition hover:shadow ${n.isRead ? 'opacity-70' : 'border-l-4 border-l-brand-600'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{n.title}</p>
                <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1.5 text-xs text-gray-400">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.isRead && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
            </div>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <EmptyState title="No notifications yet" description="Order updates and offers will show up here." />
      )}

      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(p) => { load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      )}
    </div>
  );
}
