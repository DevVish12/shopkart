import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';
import { fail } from '../utils/response.js';
import { ALL_PERMISSION_KEYS, parsePermissions } from '../modules/roles/permissions.js';

// Admin JWT guard. Attaches req.admin = { id, name, email, role, roleSlug, permissions, isSuperAdmin }.
export const adminAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 'Authentication required', 401);
    const payload = verifyToken(token);
    if (!payload || payload.type !== 'admin') return fail(res, 'Invalid token', 401);
    const rows = await query(
      `SELECT au.id, au.name, au.email, au.role, au.status, au.role_id,
              r.slug AS role_slug, r.permissions AS role_permissions, r.is_system
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       WHERE au.id = ? LIMIT 1`,
      [payload.id]
    );
    if (!rows.length) return fail(res, 'Admin not found', 401);
    if (rows[0].status !== 'active') return fail(res, 'Admin account is inactive', 403);
    const row = rows[0];
    const isSuperAdmin = row.role === 'super_admin' || row.role_slug === 'super-admin';
    req.admin = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role_slug || row.role,
      roleSlug: row.role_slug || row.role,
      permissions: isSuperAdmin ? [...ALL_PERMISSION_KEYS] : parsePermissions(row.role_permissions),
      isSuperAdmin,
    };
    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
};

// Legacy role guard, e.g. router.use(adminAuth, requireRole('super_admin')).
// Prefer requirePermission for new routes.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) return fail(res, 'Authentication required', 401);
  const held = [req.admin.role, req.admin.roleSlug];
  if (!roles.some((r) => held.includes(r))) return fail(res, 'Forbidden: insufficient permissions', 403);
  return next();
};

// Permission guard, e.g. router.get('/', adminAuth, requirePermission('orders.view'), ctrl.list).
// The admin must hold ALL listed permission keys. Super admins bypass the check.
export const requirePermission = (...keys) => (req, res, next) => {
  if (!req.admin) return fail(res, 'Authentication required', 401);
  if (req.admin.isSuperAdmin) return next();
  const held = new Set(req.admin.permissions || []);
  const ok = keys.every((k) => held.has(k));
  if (!ok) return fail(res, 'Forbidden: insufficient permissions', 403);
  return next();
};
