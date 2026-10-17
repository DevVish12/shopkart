import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { authApi } from '../../../features/auth/index.js';
import { apiErrorMessage } from '../../../services/api.js';
import { isValidPhone } from '../../../utils/validators.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name';
    if (!isValidPhone(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setMsg('');
    try {
      const u = await authApi.updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      updateUser(u);
      setMsg('Profile updated successfully.');
    } catch (err) {
      setMsg(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const tiles = [
    ['My Orders', 'Track, cancel and return orders', '/account/orders', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'],
    ['My Wishlist', 'Products you saved for later', '/account/wishlist', 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'],
    ['My Addresses', 'Manage delivery addresses', '/account/addresses', 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z'],
    ['Change Password', 'Update your account password', '/account/change-password', 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">My Account</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <div>
              <p className="font-bold">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={save} className="mt-5 space-y-4">
            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <Input label="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errors.phone} inputMode="numeric" />
            <Input label="Email" value={user?.email || ''} disabled />
            {msg && <p className="text-sm text-gray-700">{msg}</p>}
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
          <button onClick={logout} className="mt-4 text-sm font-medium text-red-600 hover:text-red-800">Logout</button>
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2">
          {tiles.map(([title, desc, to, path]) => (
            <Link key={to} to={to} className="card flex items-start gap-4 p-5 transition hover:shadow-md">
              <span className="rounded-lg bg-brand-50 p-2.5">
                <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
                </svg>
              </span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
