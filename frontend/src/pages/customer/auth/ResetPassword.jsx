import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../../features/auth/index.js';
import { apiErrorMessage } from '../../../services/api.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (otp.trim().length < 4) return setError('Enter the code sent to your email');
    if (pw.length < 6) return setError('Password must be at least 6 characters');
    if (pw !== confirm) return setError('Passwords do not match');
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp: otp.trim(), newPassword: pw });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold">Reset password</h1>
        <p className="mt-1 text-sm text-gray-500">
          {email ? <>Enter the code sent to <span className="font-semibold">{email}</span>.</> : 'Enter the code sent to your email.'}
        </p>
        {location.state?.debugOtp && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Dev mode code: <span className="font-mono font-bold">{location.state.debugOtp}</span></p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Reset code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" />
          <Input label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Reset Password</Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/login" className="link">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
