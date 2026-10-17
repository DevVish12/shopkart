import React, { useEffect, useState } from 'react';
import { checkoutApi } from '../../../features/checkout/index.js';
import { apiErrorMessage } from '../../../services/api.js';
import { isValidPhone, isValidPincode } from '../../../utils/validators.js';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import Modal from '../../../components/common/Modal.jsx';
import ConfirmDialog from '../../../components/common/ConfirmDialog.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { useToast } from '../../../components/common/Toast.jsx';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

export default function Addresses() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    try {
      setAddresses((await checkoutApi.addresses.list()) || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (a) => {
    setEditing(a || null);
    setForm(a ? { fullName: a.fullName || '', phone: a.phone || '', line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', state: a.state || '', pincode: a.pincode || '', isDefault: !!a.isDefault } : EMPTY);
    setErrors({});
    setModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!isValidPhone(form.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!form.line1.trim()) e.line1 = 'Address line is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!isValidPincode(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        isDefault: form.isDefault,
      };
      if (editing) {
        const saved = await checkoutApi.addresses.update(editing.id, payload);
        setAddresses((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      } else {
        const saved = await checkoutApi.addresses.create(payload);
        setAddresses((list) => [...list, saved]);
      }
      setModal(false);
      load();
    } catch (err) {
      setErrors({ form: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await checkoutApi.addresses.remove(deleting.id);
      setAddresses((list) => list.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  };

  const makeDefault = async (a) => {
    try {
      await checkoutApi.addresses.setDefault(a.id);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My Addresses</h1>
        <Button onClick={() => openModal(null)}>+ Add Address</Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No addresses saved" description="Add a delivery address to check out faster." action={<Button onClick={() => openModal(null)}>Add Address</Button>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{a.fullName}</p>
                {a.isDefault && <span className="badge bg-brand-100 text-brand-800">Default</span>}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}<br />
                Phone: {a.phone}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <button onClick={() => openModal(a)} className="link">Edit</button>
                {!a.isDefault && <button onClick={() => makeDefault(a)} className="link">Set as default</button>}
                <button onClick={() => setDeleting(a)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Address' : 'Add Address'} footer={
        <>
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errors.phone} inputMode="numeric" />
          <Input label="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} error={errors.line1} className="sm:col-span-2" />
          <Input label="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={errors.city} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} error={errors.state} />
          <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} error={errors.pincode} inputMode="numeric" className="sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 text-brand-600" />
            Make this my default address
          </label>
          {errors.form && <p className="text-sm text-red-600 sm:col-span-2">{errors.form}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={delLoading}
        title="Delete address?"
        message={`Delete the address at ${deleting?.line1}, ${deleting?.city}?`}
      />
    </div>
  );
}
