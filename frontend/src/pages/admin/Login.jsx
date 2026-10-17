import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useAdminAuth } from '../../routes/AdminRoute.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';

export default function AdminLogin() {
  const { admin, setAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (admin) navigate(location.state?.from || '/admin/dashboard', { replace: true });
  }, [admin, navigate, location]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/admin/auth/login', { email: form.email.trim(), password: form.password });
      const { token, admin: a } = r.data.data;
      localStorage.setItem('sk_admin_token', token);
      localStorage.setItem('sk_admin_user', JSON.stringify(a));
      setAdmin(a);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <img src="/src/assets/logo.svg" alt="ShopKart" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold">ShopKart Admin</h1>
            <p className="text-sm text-gray-500">Sign in to manage your store</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Login to Admin</Button>
        </form>
      </div>
    </div>
  );
}
