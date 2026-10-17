import api from '../../services/api.js';

function params(obj) {
  const p = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  return p.toString();
}

export const productApi = {
  list: (filters) => api.get(`/products?${params(filters)}`).then((r) => r.data),
  featured: () => api.get('/products/featured').then((r) => r.data.data),
  newArrivals: () => api.get('/products/new-arrivals').then((r) => r.data.data),
  bestSellers: () => api.get('/products/best-sellers').then((r) => r.data.data),
  flashSale: () => api.get('/products/flash-sale').then((r) => r.data.data),
  suggestions: (q) => api.get(`/products/suggestions?q=${encodeURIComponent(q)}`).then((r) => r.data.data),
  detail: (slug) => api.get(`/products/${slug}`).then((r) => r.data.data),
  reviews: (slug, opts) => api.get(`/products/${slug}/reviews?${params(opts)}`).then((r) => r.data),
};
