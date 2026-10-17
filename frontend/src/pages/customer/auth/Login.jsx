import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const r = await login(form.email.trim(), form.password);
    setLoading(false);
    if (r.ok) navigate(from, { replace: true });
    else setError(r.message);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Login to your ShopKart account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Email address" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Login</Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="link">Forgot password?</Link>
          <span className="text-gray-500">New here? <Link to="/register" className="link">Create an account</Link></span>
        </div>
      </div>
    </div>
  );
}
