// Socket.io client singleton. Connects with the stored JWT (admin or customer)
// and exposes a tiny pub/sub so pages can react to live events without reloads.
import { io } from 'socket.io-client';

let socket = null;
const listeners = new Map(); // event -> Set<fn>

const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl();
// Socket.io attaches to the same origin as the API (strip the trailing /api).
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

// Same-origin aware default (mirrors services/api.js).
function defaultApiUrl() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1' && h !== '') return '/api';
  }
  return 'http://localhost:5000/api';
}

function getToken() {
  return (
    localStorage.getItem('sk_admin_token') ||
    localStorage.getItem('sk_customer_token') ||
    ''
  );
}

export function connectRealtime() {
  const token = getToken();
  if (!token) return null;
  if (socket) {
    if (socket.auth?.token === token && socket.connected) return socket;
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  socket.auth = { token };
  // Re-dispatch to local subscribers.
  socket.onAny((event, data) => {
    const set = listeners.get(event);
    if (set) set.forEach((fn) => { try { fn(data); } catch {} });
  });
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onRealtime(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}
