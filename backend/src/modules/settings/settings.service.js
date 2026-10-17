import { SettingsModel } from './settings.model.js';

export const PUBLIC_SETTINGS_KEYS = [
  'site_name',
  'logo',
  'favicon',
  'contact_email',
  'phone',
  'address',
  'currency',
  'social_facebook',
  'social_instagram',
  'social_twitter',
  'social_youtube',
  // Razorpay: only the publishable key id + enabled flag are public. The secret NEVER leaves the server.
  'razorpay_enabled',
  'razorpay_key_id',
  // Announcement bar (top of site).
  'announcement_enabled',
  'announcement_text',
  'announcement_bg',
  // Theme name (green/blue/orange/purple/rose) — drives [data-theme] globally.
  'theme_name',
];

const KEY_RE = /^[a-zA-Z0-9_.-]{1,100}$/;

export const getPublicSettings = async () => {
  const all = await SettingsModel.getAll();
  const data = {};
  for (const key of PUBLIC_SETTINGS_KEYS) {
    data[key] = key in all ? all[key] : null;
  }
  return data;
};

export const getAllSettings = async () => SettingsModel.getAll();

export const updateSettings = async (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const err = new Error('Request body must be an object of key/value pairs');
    err.statusCode = 400;
    throw err;
  }
  const keys = Object.keys(payload);
  if (!keys.length) {
    const err = new Error('No settings provided');
    err.statusCode = 400;
    throw err;
  }
  for (const key of keys) {
    if (!KEY_RE.test(key)) {
      const err = new Error(`Invalid setting key: ${key}`);
      err.statusCode = 400;
      throw err;
    }
    const v = payload[key];
    if (v !== null && v !== undefined && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
      const err = new Error(`Invalid value for setting: ${key}`);
      err.statusCode = 400;
      throw err;
    }
  }
  const entries = keys.map((key) => ({ key, value: payload[key], group: 'general' }));
  await SettingsModel.setMany(entries);
  return true;
};
