// Roles data access. SQL only — no business logic.
import { pool, query } from '../../config/db.js';
import { ALL_PERMISSION_KEYS, sanitizePermissions, parsePermissions } from './permissions.js';

const formatRole = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    permissions: parsePermissions(row.permissions),
    is_system: Number(row.is_system || 0),
    admins_count: row.admins_count != null ? Number(row.admins_count) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const slugify = (name) =>
  String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100) || 'role';

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full access to everything, including roles and team management.',
    permissions: ALL_PERMISSION_KEYS,
    is_system: 1,
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Can manage the store day-to-day. Cannot manage roles, team or settings.',
    permissions: ALL_PERMISSION_KEYS.filter(
      (k) => !k.startsWith('roles.') && !k.startsWith('admins.') && k !== 'settings.edit'
    ),
    is_system: 1,
  },
  {
    name: 'Support',
    slug: 'support',
    description: 'Customer support: orders, customers and reviews only.',
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.edit',
      'customers.view',
      'reviews.view',
      'reviews.moderate',
      'notifications.view',
    ],
    is_system: 1,
  },
];

export const RoleModel = {
  format: formatRole,

  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS roles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NULL,
      permissions JSON NOT NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  /**
   * Idempotent migration: links admin_users to roles.
   * CREATE TABLE IF NOT EXISTS never alters an existing table, so the
   * role_id column + backfill are handled here on every boot.
   */
  async migrateAdminUsers() {
    const cols = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'`
    );
    const names = cols.map((c) => c.COLUMN_NAME);
    if (!names.includes('role_id')) {
      await query(
        `ALTER TABLE admin_users
         ADD COLUMN role_id INT UNSIGNED NULL AFTER role,
         ADD CONSTRAINT fk_admin_users_role FOREIGN KEY (role_id)
           REFERENCES roles(id) ON DELETE SET NULL`
      );
    }
    // Backfill: legacy role enum -> seeded roles. Only touches NULL rows.
    await query(
      `UPDATE admin_users au
       JOIN roles r ON r.slug = CASE WHEN au.role = 'super_admin' THEN 'super-admin' ELSE 'manager' END
       SET au.role_id = r.id
       WHERE au.role_id IS NULL`
    );
  },

  /** Seed the built-in roles. Never overwrites existing ones. */
  async seedDefaults() {
    for (const r of DEFAULT_ROLES) {
      const existing = await query('SELECT id FROM roles WHERE slug = ? LIMIT 1', [r.slug]);
      if (!existing.length) {
        await query(
          'INSERT INTO roles (name, slug, description, permissions, is_system) VALUES (?, ?, ?, ?, ?)',
          [r.name, r.slug, r.description, JSON.stringify(sanitizePermissions(r.permissions)), r.is_system]
        );
      }
    }
  },

  async list() {
    const rows = await query(
      `SELECT r.*, (SELECT COUNT(*) FROM admin_users au WHERE au.role_id = r.id) AS admins_count
       FROM roles r ORDER BY r.is_system DESC, r.name ASC`
    );
    return rows.map(formatRole);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [id]);
    return formatRole(rows[0]);
  },

  async findBySlug(slug) {
    const rows = await query('SELECT * FROM roles WHERE slug = ? LIMIT 1', [slug]);
    return formatRole(rows[0]);
  },

  async create({ name, slug, description, permissions }) {
    const finalSlug = (slug || slugify(name)).toLowerCase();
    const result = await pool.query(
      'INSERT INTO roles (name, slug, description, permissions, is_system) VALUES (?, ?, ?, ?, 0)',
      [name.trim(), finalSlug, description || null, JSON.stringify(sanitizePermissions(permissions))]
    );
    return this.findById(result[0].insertId);
  },

  async update(id, { name, description, permissions }) {
    const role = await this.findById(id);
    if (!role) return null;
    // System roles keep their slug + permission set locked.
    const fields = ['name = ?', 'description = ?'];
    const params = [name.trim(), description || null];
    if (!role.is_system) {
      fields.push('permissions = ?');
      params.push(JSON.stringify(sanitizePermissions(permissions)));
    }
    params.push(id);
    await query(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  async delete(id) {
    const role = await this.findById(id);
    if (!role || role.is_system) return false;
    const assigned = await query('SELECT COUNT(*) AS cnt FROM admin_users WHERE role_id = ?', [id]);
    if (Number(assigned[0].cnt) > 0) return false;
    await query('DELETE FROM roles WHERE id = ? LIMIT 1', [id]);
    return true;
  },

  async countAdmins(roleId) {
    const rows = await query('SELECT COUNT(*) AS cnt FROM admin_users WHERE role_id = ?', [roleId]);
    return Number(rows[0].cnt);
  },
};
