import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';
import { fail } from '../utils/response.js';

// Customer JWT guard. Attaches req.user = { id, name, email, phone }.
export const customerAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 'Authentication required', 401);
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'customer') return fail(res, 'Invalid token', 401);
    const rows = await query(
      'SELECT id, name, email, phone, status FROM users WHERE id = ? LIMIT 1',
      [payload.id]
    );
    if (!rows.length) return fail(res, 'User not found', 401);
    if (rows[0].status === 'blocked') return fail(res, 'Your account has been blocked', 403);
    req.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, phone: rows[0].phone };
    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
};
