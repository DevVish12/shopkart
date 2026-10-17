import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../features/auth/index.js';
import { apiErrorMessage } from '../../../services/api.js';
import { isValidEmail } from '../../../utils/validators.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const r = await authApi.forgotPassword({ email: email.trim() });
      navigate('/reset-password', { state: { email: email.trim(), debugOtp: r.debugOtp } });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold">Forgot password?</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your account email and we will send you a reset code.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" className="w-full" loading={loading}>Send Reset Code</Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/login" className="link">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
