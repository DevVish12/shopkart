import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCart = useCallback(async () => {
    if (!localStorage.getItem('sk_customer_token')) {
      setCart({ items: [], subtotal: 0, itemCount: 0 });
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/cart');
      setCart(res.data.data.cart || { items: [], subtotal: 0, itemCount: 0 });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  const applyCart = (c) => setCart(c || { items: [], subtotal: 0, itemCount: 0 });

  const addItem = async (productId, variantId, qty = 1) => {
    try {
      const res = await api.post('/cart/items', { productId, variantId: variantId || undefined, qty });
      applyCart(res.data.data.cart);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err) };
    }
  };

  const updateQty = async (itemId, qty) => {
    try {
      const res = await api.put(`/cart/items/${itemId}`, { qty });
      applyCart(res.data.data.cart);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err) };
    }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      applyCart(res.data.data.cart);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err) };
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart');
      setCart({ items: [], subtotal: 0, itemCount: 0 });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err) };
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, error, fetchCart, addItem, updateQty, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
