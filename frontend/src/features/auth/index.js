import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

export { useAuth };
export const authApi = {
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
  updateProfile: (payload) => api.put('/auth/profile', payload).then((r) => r.data.data.user),
  changePassword: (payload) => api.put('/auth/change-password', payload).then((r) => r.data),
  sendOtp: (payload) => api.post('/auth/send-otp', payload).then((r) => r.data),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload).then((r) => r.data),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};
