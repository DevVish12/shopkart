import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ImageUploadField from '../../components/admin/ImageUploadField.jsx';
import { THEMES, setTheme } from '../../theme.js';
import { useToast } from '../../components/common/Toast.jsx';

const GROUPS = [
  {
    title: 'Store',
    keys: ['site_name', 'logo', 'favicon', 'currency', 'gst_number'],
  },
  {
    title: 'Contact',
    keys: ['contact_email', 'phone', 'address'],
  },
  {
    title: 'Tax & Shipping',
    keys: ['tax_percent', 'default_shipping_charge', 'free_shipping_above'],
  },
  {
    title: 'Payments',
    keys: ['payment_cod_enabled', 'razorpay_enabled', 'razorpay_key_id', 'razorpay_key_secret'],
  },
  {
    title: 'Announcement Bar (top of site)',
    keys: ['announcement_enabled', 'announcement_text', 'announcement_bg'],
  },
  {
    title: 'Social Links',
    keys: ['social_facebook', 'social_instagram', 'social_twitter', 'social_youtube'],
  },
];

const LABELS = {
  site_name: 'Website name',
  logo: 'Store logo',
  favicon: 'Favicon',
  currency: 'Currency',
  gst_number: 'GST number',
  contact_email: 'Contact email',
  phone: 'Phone',
  address: 'Address',
  tax_percent: 'Tax % (GST)',
  default_shipping_charge: 'Default shipping charge (₹)',
  free_shipping_above: 'Free shipping above (₹)',
  payment_cod_enabled: 'COD enabled (1 = on, 0 = off)',
  razorpay_enabled: 'Razorpay enabled (1 = on, 0 = off)',
  razorpay_key_id: 'Razorpay Key ID',
  razorpay_key_secret: 'Razorpay Key Secret',
  social_facebook: 'Facebook URL',
  social_instagram: 'Instagram URL',
  social_twitter: 'X (Twitter) URL',
  social_youtube: 'YouTube URL',
  announcement_enabled: 'Show announcement bar (1 = on, 0 = off)',
  announcement_text: 'Announcement text',
  announcement_bg: 'Bar background color (e.g. #7c3aed)',
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [extra, setExtra] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const toast = useToast();

  useEffect(() => {
    api
      .get('/admin/settings')
      .then((r) => setValues(r.data.data || {}))
      .catch(() => setValues({}))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.put('/admin/settings', values);
      setTheme(values.theme_name || 'green'); // apply instantly
      toast.success('Settings saved successfully.');
      setMsg('Settings saved successfully.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save settings.'));
      setMsg(apiErrorMessage(err, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const extraKeys = Object.keys(values).filter((k) => !known.has(k));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Website Settings</h1>
        <Button onClick={save} loading={saving}>Save Settings</Button>
      </div>

      <div className="mt-5 space-y-6">
        {/* Theme picker — one change re-colors the whole site + admin */}
        <div className="card p-6">
          <h2 className="font-bold">Theme Color</h2>
          <p className="mt-1 text-sm text-gray-500">Pick once — header buttons, badges, links and admin accents all follow.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {THEMES.map((t) => {
              const active = (values.theme_name || 'green') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setValues({ ...values, theme_name: t.id }); setTheme(t.id); }}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="h-6 w-6 rounded-full ring-2 ring-white" style={{ backgroundColor: t.swatch }} />
                  {t.label}
                  {active && <span className="text-xs text-gray-500">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {GROUPS.map((g) => (
          <div key={g.title} className="card p-6">
            <h2 className="font-bold">{g.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {g.keys.map((k) =>
                k === 'logo' || k === 'favicon' ? (
                  <ImageUploadField
                    key={k}
                    label={LABELS[k] || k}
                    settingKey={k}
                    value={values[k] ?? ''}
                    onChange={(v) => setValues({ ...values, [k]: v })}
                    hint={k === 'logo' ? 'PNG with transparent background works best. Shown in the store header.' : 'Small square icon shown in the browser tab.'}
                  />
                ) : (
                  <Input
                    key={k}
                    label={LABELS[k] || k}
                    type={k.includes('key_secret') ? 'password' : 'text'}
                    value={values[k] ?? ''}
                    onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                  />
                )
              )}
            </div>
          </div>
        ))}

        {extraKeys.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold">Other Settings</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {extraKeys.map((k) => (
                <Input key={k} label={k} value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
              ))}
            </div>
          </div>
        )}
      </div>

      {msg && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{msg}</p>}
      <Button className="mt-4" onClick={save} loading={saving}>Save Settings</Button>
    </div>
  );
}
