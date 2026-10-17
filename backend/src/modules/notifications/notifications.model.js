import { pool, query } from '../../config/db.js';

export const NotificationModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_notifications_user (user_id),
      INDEX idx_notifications_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    // server.js only awaits NotificationModel.ensureTable(); ensure the
    // newsletter table here too so it always exists.
    await NewsletterModel.ensureTable();
  },

  async listForUser(userId, limit, offset) {
    return query(
      `SELECT * FROM notifications
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  },

  async countForUser(userId) {
    const rows = await query(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? OR user_id IS NULL',
      [userId]
    );
    return Number(rows[0].total);
  },

  async unreadCount(userId) {
    const rows = await query(
      'SELECT COUNT(*) AS cnt FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0',
      [userId]
    );
    return Number(rows[0].cnt);
  },

  async markRead(id, userId) {
    const result = await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, userId]
    );
    return result.affectedRows || 0;
  },

  async markAllRead(userId) {
    const result = await query(
      'UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0',
      [userId]
    );
    return result.affectedRows || 0;
  },

  async listForAdmin(limit, offset) {
    return query(
      'SELECT * FROM notifications ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  },

  async countAll() {
    const rows = await query('SELECT COUNT(*) AS total FROM notifications');
    return Number(rows[0].total);
  },

  async create({ userId, type, title, message }) {
    const result = await pool.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [userId || null, type, title, message]
    );
    const rows = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [
      result[0].insertId,
    ]);
    return rows[0];
  },
};

export const NewsletterModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL UNIQUE,
      status ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async findByEmail(email) {
    const rows = await query('SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async subscribe(email) {
    await query('INSERT INTO newsletter_subscribers (email, status) VALUES (?, ?)', [
      email,
      'subscribed',
    ]);
  },

  async resubscribe(email) {
    await query("UPDATE newsletter_subscribers SET status = 'subscribed' WHERE email = ?", [email]);
  },
};
