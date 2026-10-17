import { pool, query } from '../../config/db.js';

// Table: banners(id, title, subtitle NULL, image, button_text NULL, button_link NULL,
//         position DEFAULT 'home_hero', sort_order DEFAULT 0, starts_at NULL,
//         ends_at NULL, status ENUM('active','inactive'))
export const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS banners (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(500) NULL,
      image VARCHAR(500) NOT NULL,
      button_text VARCHAR(100) NULL,
      button_link VARCHAR(500) NULL,
      position VARCHAR(50) NOT NULL DEFAULT 'home_hero',
      sort_order INT NOT NULL DEFAULT 0,
      starts_at DATETIME NULL,
      ends_at DATETIME NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_banners_position_status (position, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Safe additive migration for installs created before coupon_code existed.
  const cols = await query(`SHOW COLUMNS FROM banners LIKE 'coupon_code'`);
  if (!cols.length) {
    await query(`ALTER TABLE banners ADD COLUMN coupon_code VARCHAR(50) NULL AFTER button_link`);
  }
};

const PUBLIC_COLUMNS =
  'id, title, subtitle, image, button_text, button_link, coupon_code';

export const BannerModel = {
  ensureTable,

  // Public: only active, date-valid banners for a position, ordered.
  async findActive(position = 'home_hero') {
    return query(
      `SELECT ${PUBLIC_COLUMNS} FROM banners
       WHERE status = 'active'
         AND position = ?
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY sort_order ASC, id ASC`,
      [position]
    );
  },

  async findAllPaginated(limit, offset) {
    const [rows, countRows] = await Promise.all([
      query(
        'SELECT * FROM banners ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      ),
      query('SELECT COUNT(*) AS total FROM banners'),
    ]);
    return { rows, total: countRows[0].total };
  },

  async findById(id) {
    const rows = await query('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO banners
         (title, subtitle, image, button_text, button_link, coupon_code, position, sort_order, starts_at, ends_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.subtitle || null,
        data.image,
        data.button_text || null,
        data.button_link || null,
        data.coupon_code || null,
        data.position || 'home_hero',
        data.sort_order ?? 0,
        data.starts_at || null,
        data.ends_at || null,
        data.status || 'active',
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key of [
      'title',
      'subtitle',
      'image',
      'button_text',
      'button_link',
      'coupon_code',
      'position',
      'sort_order',
      'starts_at',
      'ends_at',
      'status',
    ]) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return this.findById(id);
    values.push(id);
    await query(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM banners WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async updateStatus(id, status) {
    const result = await query('UPDATE banners SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  },
};
