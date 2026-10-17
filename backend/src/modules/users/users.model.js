import { pool, query } from '../../config/db.js';

// Creates ONLY the addresses table; the users table is ensured by the auth module.
export const ensureTable = async () => {
  await query(`CREATE TABLE IF NOT EXISTS addresses (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
};

export const CustomerModel = {
  async listAdmin({ search, status, limit, offset }) {
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
              COUNT(o.id) AS orders_count,
              COALESCE(SUM(o.grand_total), 0) AS total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.order_status <> 'cancelled'
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const countRows = await query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
    return { rows, total: Number(countRows[0].total) };
  },

  async findById(id) {
    const rows = await query(
      'SELECT id, name, email, phone, email_verified, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async setStatus(id, status) {
    await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  },

  async getOrders(userId, limit = 20) {
    return query(
      `SELECT id, order_number, grand_total, order_status, created_at
       FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
      [userId, limit]
    );
  },

  async getStats(userId) {
    const rows = await query(
      `SELECT COUNT(*) AS orders_count, COALESCE(SUM(grand_total), 0) AS total_spent
       FROM orders WHERE user_id = ? AND order_status <> 'cancelled'`,
      [userId]
    );
    return { ordersCount: Number(rows[0].orders_count), totalSpent: Number(rows[0].total_spent) };
  },

  // ---------- addresses ----------

  async listAddresses(userId) {
    return query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [userId]
    );
  },

  async findAddress(id) {
    const rows = await query('SELECT * FROM addresses WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async countAddresses(userId) {
    const rows = await query('SELECT COUNT(*) AS cnt FROM addresses WHERE user_id = ?', [userId]);
    return Number(rows[0].cnt);
  },

  async unsetDefaults(userId) {
    await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
  },

  async createAddress(userId, data) {
    const result = await pool.query(
      `INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.fullName,
        data.phone,
        data.line1,
        data.line2 || null,
        data.city,
        data.state,
        data.pincode,
        data.isDefault ? 1 : 0,
      ]
    );
    return this.findAddress(result[0].insertId);
  },

  async updateAddress(id, data) {
    await query(
      `UPDATE addresses SET full_name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?, pincode = ?
       WHERE id = ?`,
      [
        data.fullName,
        data.phone,
        data.line1,
        data.line2 || null,
        data.city,
        data.state,
        data.pincode,
        id,
      ]
    );
    return this.findAddress(id);
  },

  async setDefault(id) {
    await query('UPDATE addresses SET is_default = 1 WHERE id = ?', [id]);
  },

  async deleteAddress(id) {
    await query('DELETE FROM addresses WHERE id = ?', [id]);
  },
};
