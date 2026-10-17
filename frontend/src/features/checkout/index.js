import api from '../../services/api.js';

export const checkoutApi = {
  addresses: {
    list: () => api.get('/addresses').then((r) => r.data.data),
    create: (payload) => api.post('/addresses', payload).then((r) => r.data.data),
    update: (id, payload) => api.put(`/addresses/${id}`, payload).then((r) => r.data.data),
    remove: (id) => api.delete(`/addresses/${id}`).then((r) => r.data),
    setDefault: (id) => api.put(`/addresses/${id}/default`).then((r) => r.data),
  },
  validateCoupon: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }).then((r) => r.data.data),
  shippingZones: () => api.get('/shipping/zones').then((r) => r.data.data),
  checkPincode: (pincode) => api.post('/shipping/check', { pincode }).then((r) => r.data.data),
  placeOrder: (payload) => api.post('/orders/checkout', payload).then((r) => r.data.data),
  razorpayOrder: (orderId) => api.post('/payments/razorpay/order', { orderId }).then((r) => r.data.data),
  razorpayVerify: (payload) => api.post('/payments/razorpay/verify', payload).then((r) => r.data.data),
};
