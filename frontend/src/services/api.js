import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl();
export const UPLOAD_BASE = API_URL.replace(/\/api\/?$/, '');

// Same-origin aware default: when the backend serves the built storefront
// (single-service deploys like Koyeb free), the API lives at /api on the
// same host — no env wiring needed. Local dev still hits localhost:5000.
function defaultApiUrl() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1' && h !== '') return '/api';
  }
  return 'http://localhost:5000/api';
}

export function imageUrl(path) {
  if (!path) return '/src/assets/logo.svg';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `${UPLOAD_BASE}/${path}`;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const isAdmin = config.url?.startsWith('/admin');
  const token = isAdmin
    ? localStorage.getItem('sk_admin_token')
    : localStorage.getItem('sk_customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err.config?.url || '';
      if (url.startsWith('/admin')) {
        localStorage.removeItem('sk_admin_token');
        localStorage.removeItem('sk_admin_user');
        if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else if (err.config?.url && !err.config.url.includes('/auth/')) {
        localStorage.removeItem('sk_customer_token');
        localStorage.removeItem('sk_customer_user');
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
