import { pool, query } from '../../config/db.js';

export const UserModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      phone VARCHAR(20) NULL,
      password_hash VARCHAR(255) NOT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('active','blocked') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async findByEmail(email) {
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async create({ name, email, phone, passwordHash }) {
    const result = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, passwordHash]
    );
    const insertId = result[0].insertId;
    return this.findById(insertId);
  },

  async updateProfile(id, { name, phone }) {
    await query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, id]);
    return this.findById(id);
  },

  async setPassword(id, passwordHash) {
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async setEmailVerified(id) {
    await query('UPDATE users SET email_verified = 1 WHERE id = ?', [id]);
  },

  async setStatus(id, status) {
    await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  },
};

export const OtpModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS otps (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      purpose ENUM('verify_email','reset_password') NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otps_email_purpose (email, purpose)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async invalidateOld(email, purpose) {
    await query('UPDATE otps SET used = 1 WHERE email = ? AND purpose = ? AND used = 0', [
      email,
      purpose,
    ]);
  },

  async create({ email, otpHash, purpose, expiresAt }) {
    const result = await pool.query(
      'INSERT INTO otps (email, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otpHash, purpose, expiresAt]
    );
    const rows = await query('SELECT * FROM otps WHERE id = ? LIMIT 1', [result[0].insertId]);
    return rows[0];
  },

  async findLatestValid(email, purpose) {
    const rows = await query(
      `SELECT * FROM otps
       WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, purpose]
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await query('UPDATE otps SET used = 1 WHERE id = ?', [id]);
  },
};

export const AdminUserModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS admin_users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async findByEmail(email) {
    const rows = await query('SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  /** Admin with joined role info (slug, name, permissions, is_system). */
  async findByIdWithRole(id) {
    const rows = await query(
      `SELECT au.*, r.slug AS role_slug, r.name AS role_name,
              r.permissions AS role_permissions, r.is_system AS role_is_system
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       WHERE au.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByEmailWithRole(email) {
    const rows = await query(
      `SELECT au.*, r.slug AS role_slug, r.name AS role_name,
              r.permissions AS role_permissions, r.is_system AS role_is_system
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       WHERE au.email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async list() {
    return query(
      `SELECT au.id, au.name, au.email, au.role, au.role_id, au.status, au.created_at,
              r.slug AS role_slug, r.name AS role_name
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       ORDER BY au.id ASC`
    );
  },

  async countSuperAdmins() {
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       WHERE au.role = 'super_admin' OR r.slug = 'super-admin'`
    );
    return Number(rows[0].cnt);
  },

  /** Legacy enum column stays in sync with the assigned role. */
  async legacyRoleFor(roleId) {
    if (!roleId) return 'admin';
    const rows = await query('SELECT slug FROM roles WHERE id = ? LIMIT 1', [roleId]);
    return rows[0] && rows[0].slug === 'super-admin' ? 'super_admin' : 'admin';
  },

  async create({ name, email, passwordHash, roleId }) {
    const legacyRole = await this.legacyRoleFor(roleId);
    const result = await pool.query(
      'INSERT INTO admin_users (name, email, password_hash, role, role_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, legacyRole, roleId || null]
    );
    return this.findByIdWithRole(result[0].insertId);
  },

  async update(id, { name, roleId, status }) {
    const legacyRole = await this.legacyRoleFor(roleId);
    await query('UPDATE admin_users SET name = ?, role = ?, role_id = ?, status = ? WHERE id = ?', [
      name,
      legacyRole,
      roleId || null,
      status,
      id,
    ]);
    return this.findByIdWithRole(id);
  },

  async remove(id) {
    await query('DELETE FROM admin_users WHERE id = ?', [id]);
  },
};
