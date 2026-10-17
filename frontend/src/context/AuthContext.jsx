import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../services/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sk_customer_token';
const USER_KEY = 'sk_customer_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const u = res.data.data.user;
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (err) {
      // Only a 401 means the token is invalid/expired → real logout.
      // Network blips or server restarts must NOT log the user out.
      if (err?.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: u } = res.data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err, 'Login failed') };
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post('/auth/register', payload);
      const { token, user: u } = res.data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err, 'Registration failed') };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshMe: fetchMe, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
