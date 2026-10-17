// Razorpay configuration — reads from the settings table first (manageable
// from the admin dashboard), falls back to environment variables.
// The SECRET is only ever used server-side; never expose it publicly.
import { SettingsModel } from '../modules/settings/settings.model.js';
import env from './env.js';

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30 * 1000; // re-read settings at most every 30s

export const getRazorpayConfig = async () => {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  let fromDb = {};
  try {
    fromDb = await SettingsModel.getAll();
  } catch {
    fromDb = {};
  }

  const keyId = (fromDb.razorpay_key_id || env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (fromDb.razorpay_key_secret || env.RAZORPAY_KEY_SECRET || '').trim();
  const enabled =
    String(fromDb.razorpay_enabled ?? '').trim() === '1' ||
    String(fromDb.razorpay_enabled ?? '').trim().toLowerCase() === 'true' ||
    (!('razorpay_enabled' in fromDb) && Boolean(keyId && keySecret));

  cache = { keyId, keySecret, enabled: enabled && Boolean(keyId && keySecret) };
  cacheAt = now;
  return cache;
};

/** Force a config re-read (called after admin updates payment settings). */
export const clearRazorpayConfigCache = () => {
  cache = null;
  cacheAt = 0;
};
