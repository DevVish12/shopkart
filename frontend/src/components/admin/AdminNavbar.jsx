import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../routes/AdminRoute.jsx';
import Button from '../common/Button.jsx';
import { notificationApi } from '../../features/orders/index.js';

const TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/brands': 'Brands',
  '/admin/orders': 'Orders',
  '/admin/customers': 'Customers',
  '/admin/coupons': 'Coupons',
  '/admin/reviews': 'Reviews',
  '/admin/banners': 'Banners',
  '/admin/shipping': 'Shipping',
  '/admin/notifications': 'Notifications',
  '/admin/reports': 'Reports',
  '/admin/cms': 'CMS Pages',
  '/admin/settings': 'Settings',
  '/admin/roles': 'Roles',
  '/admin/users': 'Admin Users',
};

export default function AdminNavbar({ onMenuClick }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      notificationApi.list(1).then((r) => {
        if (mounted) setUnread(r.data?.unreadCount || 0);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const title = TITLES[pathname] || 'Admin';

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 shadow-[0_1px_12px_rgba(11,28,48,0.06)] backdrop-blur-md sm:px-6">
      <button onClick={onMenuClick} className="rounded-xl p-2 text-sk-ink transition hover:bg-sk-mist lg:hidden" aria-label="Open menu">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div>
        <h1 className="font-display text-base font-extrabold tracking-tight text-sk-ink sm:text-lg">{title}</h1>
        <p className="hidden text-xs text-sk-muted sm:block">Welcome back, {admin?.name}</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link to="/admin/notifications" className="relative rounded-full p-2.5 text-gray-600 transition hover:bg-gray-100" aria-label="Notifications">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link to="/" target="_blank" rel="noreferrer" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 sm:block">
          View Store ↗
        </Link>
        <span className="badge hidden bg-brand-100 text-brand-800 md:inline-flex">{admin?.role_name || (admin?.role === 'super_admin' ? 'Super Admin' : 'Admin')}</span>
        <Button variant="outline" onClick={handleLogout} className="!py-2">Logout</Button>
      </div>
    </div>
  );
}
