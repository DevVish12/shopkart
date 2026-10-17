import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { isValidEmail, isValidPhone } from '../../../utils/validators.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!isValidPhone(form.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const r = await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
    setLoading(false);
    if (r.ok) navigate('/');
    else setErrors({ form: r.message });
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join ShopKart for faster checkout and order tracking.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
          <Input label="Email address" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <Input label="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errors.phone} inputMode="numeric" autoComplete="tel" />
          <Input label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
          <Input label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
          {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
          <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="link">Login</Link>
        </p>
      </div>
    </div>
  );
}
