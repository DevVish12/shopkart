// Global theme applier. The admin picks a theme in Settings → Theme;
// it is stored as the `theme_name` setting and applied here as
// [data-theme] on <html>, which re-themes every brand-* utility instantly.
import api from './services/api.js';

export const THEMES = [
  { id: 'green', label: 'Fresh Green', swatch: '#16a34a' },
  { id: 'blue', label: 'Royal Blue', swatch: '#2549eb' },
  { id: 'orange', label: 'Sunset Orange', swatch: '#ea580c' },
  { id: 'purple', label: 'Royal Purple', swatch: '#9333ea' },
  { id: 'rose', label: 'Rose Red', swatch: '#e11d48' },
];

export const DEFAULT_THEME = 'blue';

export function setTheme(name) {
  const id = THEMES.some((t) => t.id === name) ? name : DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', id);
  try {
    localStorage.setItem('sk_theme', id);
  } catch {}
}

export async function loadTheme() {
  // Always set an explicit theme (no flash of un-themed content), then
  // prefer the cached choice, then the authoritative server setting.
  setTheme(DEFAULT_THEME);
  try {
    const cached = localStorage.getItem('sk_theme');
    if (cached) setTheme(cached);
  } catch {}
  try {
    const r = await api.get('/settings/public');
    const name = r.data?.data?.theme_name;
    if (name) setTheme(name);
  } catch {}
}
