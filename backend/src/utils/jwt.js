import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signCustomerToken = (userId) =>
  jwt.sign({ id: userId, type: 'customer' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const signAdminToken = (adminId, role) =>
  jwt.sign({ id: adminId, type: 'admin', role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);
