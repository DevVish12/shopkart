import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import api from '../services/api.js';
import Loader from '../components/common/Loader.jsx';

const AdminAuthContext = createContext(null);
export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sk_admin_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sk_admin_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/admin/auth/me')
      .then((r) => {
        const a = r.data.data.admin;
        setAdmin(a);
        localStorage.setItem('sk_admin_user', JSON.stringify(a));
      })
      .catch((err) => {
        // Only a 401 means the token is invalid/expired → real logout.
        // Network blips or server restarts must NOT log the admin out.
        if (err?.response?.status === 401) {
          localStorage.removeItem('sk_admin_token');
          localStorage.removeItem('sk_admin_user');
          setAdmin(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('sk_admin_token');
    localStorage.removeItem('sk_admin_user');
    setAdmin(null);
  };

  // can('products.edit') — true when the signed-in admin holds ALL listed permissions.
  const can = (...keys) => {
    if (!admin) return false;
    if (admin.is_super_admin) return true;
    const held = new Set(admin.permissions || []);
    return keys.every((k) => held.has(k));
  };

  return <AdminAuthContext.Provider value={{ admin, loading, logout, setAdmin, can }}>{children}</AdminAuthContext.Provider>;
}

export default function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) return <Loader fullPage text="Verifying admin session…" />;
  if (!admin) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  return children ?? <Outlet />;
}

/** Route guard: renders children only when the admin holds the permission, else a 403 page. */
export function RequirePermission({ perm, children }) {
  const { admin, loading, can } = useAdminAuth();
  if (loading) return <Loader fullPage text="Verifying admin session…" />;
  if (!admin || !can(perm)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-xl font-extrabold text-gray-900">Access denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your role does not have permission to view this page ({perm}). Ask a super admin for access.
        </p>
      </div>
    );
  }
  return children;
}
