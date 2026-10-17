import { useCart } from '../../context/CartContext.jsx';
import api from '../../services/api.js';

export { useCart };
export const cartApi = {
  get: () => api.get('/cart').then((r) => r.data.data.cart),
  add: (productId, variantId, qty) => api.post('/cart/items', { productId, variantId, qty }).then((r) => r.data.data.cart),
  update: (itemId, qty) => api.put(`/cart/items/${itemId}`, { qty }).then((r) => r.data.data.cart),
  remove: (itemId) => api.delete(`/cart/items/${itemId}`).then((r) => r.data.data.cart),
  clear: () => api.delete('/cart').then((r) => r.data),
};
