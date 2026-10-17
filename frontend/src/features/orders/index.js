import api from '../../services/api.js';

export const orderApi = {
  list: (opts) => {
    const p = new URLSearchParams();
    Object.entries(opts || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.append(k, v);
    });
    return api.get(`/orders?${p.toString()}`).then((r) => r.data);
  },
  detail: (id) => api.get(`/orders/${id}`).then((r) => r.data.data),
  cancel: (id) => api.post(`/orders/${id}/cancel`).then((r) => r.data.data),
  returnRequest: (id, reason) => api.post(`/orders/${id}/return`, { reason }).then((r) => r.data.data),
};

export const notificationApi = {
  list: (page) => api.get(`/notifications${page ? `?page=${page}` : ''}`).then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};

export const reviewApi = {
  create: (formData) => api.post('/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  update: (id, payload) => api.put(`/reviews/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
};
