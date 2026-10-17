import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../routes/AdminRoute.jsx';
import api, { imageUrl } from '../../services/api.js';

// [label, to, iconPath, permission]
const GROUPS = [
  {
    title: 'Overview',
    links: [
      ['Dashboard', '/admin/dashboard', 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', 'dashboard.view'],
    ],
  },
  {
    title: 'Catalog',
    links: [
      ['Products', '/admin/products', 'M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10V11m0 10l-8-4V7m8 4L4 7', 'products.view'],
      ['Categories', '/admin/categories', 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', 'categories.view'],
      ['Brands', '/admin/brands', 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', 'brands.view'],
    ],
  },
  {
    title: 'Sales',
    links: [
      ['Orders', '/admin/orders', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 'orders.view'],
      ['Customers', '/admin/customers', 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', 'customers.view'],
      ['Coupons', '/admin/coupons', 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', 'coupons.view'],
      ['Reviews', '/admin/reviews', 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', 'reviews.view'],
    ],
  },
  {
    title: 'Marketing',
    links: [
      ['Banners', '/admin/banners', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', 'banners.view'],
      ['Notifications', '/admin/notifications', 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', 'notifications.view'],
      ['CMS Pages', '/admin/cms', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'cms.view'],
    ],
  },
  {
    title: 'Configuration',
    links: [
      ['Shipping', '/admin/shipping', 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0 2 2 0 00-4 0z', 'shipping.view'],
      ['Reports', '/admin/reports', 'M9 17v-6m4 6v-8m4 8v-12M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z', 'reports.view'],
      ['Settings', '/admin/settings', 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', 'settings.view'],
      ['Roles', '/admin/roles', 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-8 0 4 4 0 008 0zm6-1.13a4 4 0 01-3 3.87', 'roles.view'],
      ['Admin Users', '/admin/users', 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z', 'admins.view'],
    ],
  },
];

export default function AdminSidebar({ open, onClose }) {
  const { can, admin } = useAdminAuth();
  const navigate = useNavigate();
  const [siteName, setSiteName] = useState('ShopKart');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    api.get('/settings/public').then((r) => {
      const s = r.data?.data || {};
      if (s.site_name) setSiteName(s.site_name);
      if (s.logo) setLogo(s.logo);
    }).catch(() => {});
  }, []);

  const visibleGroups = GROUPS
    .map((g) => ({ ...g, links: g.links.filter(([, , , perm]) => !perm || can(perm)) }))
    .filter((g) => g.links.length > 0);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-sk-ink/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col text-slate-300 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #0B1C30 0%, #10294d 60%, #0d2140 100%)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/15 backdrop-blur">
            {logo ? (
              <img src={imageUrl(logo)} alt={siteName} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="bg-gradient-to-br from-sk-bright to-sk-primary bg-clip-text text-2xl font-extrabold text-transparent">
                {siteName.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-extrabold tracking-tight text-white">{siteName}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sk-bright/80">Admin Panel</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          {visibleGroups.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{g.title}</p>
              <div className="space-y-1">
                {g.links.map(([label, to, path]) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-sk-primary to-sk-bright text-white shadow-lg shadow-sk-primary/30'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      }`
                    }
                  >
                    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
                    </svg>
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sk-bright to-sk-primary text-sm font-bold text-white">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{admin?.name || 'Admin'}</p>
              <p className="truncate text-xs text-slate-400">{admin?.role_name || admin?.role || 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            View Store
          </button>
        </div>
      </aside>
    </>
  );
}
