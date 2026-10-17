// Realtime layer (Socket.io). Emits live updates so admin and customer pages
// refresh instantly without reloads:
//   - room `admins`        → every connected admin
//   - room `user:<id>`     → a single customer
// Events:
//   - `order:created` { order }            → admins (new order placed)
//   - `order:status`  { orderId, status }  → admins + owning customer
//   - `notification:new` { notification }   → owning customer
import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.js';
import env from './config/env.js';

let io = null;

export const getIO = () => io;

const parseOrigins = () => {
  if (env.FRONTEND_URL === '*') return '*';
  return env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
};

export const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: parseOrigins(), credentials: true },
  });

  // Authenticate every socket with the same JWTs the REST API uses.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('auth required'));
      const payload = verifyToken(token);
      if (!payload || !payload.id) return next(new Error('invalid token'));
      socket.user = payload; // { id, type: 'admin' | 'customer', ... }
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, type } = socket.user;
    if (type === 'admin') {
      socket.join('admins');
    } else {
      socket.join(`user:${id}`);
    }
    socket.on('disconnect', () => {});
  });

  return io;
};

// ---- emit helpers (safe no-ops until initRealtime runs) ----

export const emitToAdmins = (event, data) => {
  if (io) io.to('admins').emit(event, data);
};

export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

export const emitOrderCreated = (order) => {
  emitToAdmins('order:created', { order });
};

export const emitOrderStatus = (orderId, userId, status, orderNumber) => {
  const payload = { orderId, status, orderNumber };
  emitToAdmins('order:status', payload);
  if (userId) emitToUser(userId, 'order:status', payload);
};

export const emitNotification = (userId, notification) => {
  if (userId) emitToUser(userId, 'notification:new', { notification });
};

// Product catalog changed (admin add/edit/delete) — storefront refreshes lists live.
export const emitProductChanged = (action, product) => {
  if (!io) return;
  io.emit('product:changed', { action, product: product || null });
};

// User-side activity for the admin room.
export const emitReviewCreated = (review) => {
  emitToAdmins('review:created', { review });
};

export const emitUserRegistered = (user) => {
  emitToAdmins('user:registered', { user });
};
