// Brands data layer — raw SQL only.
import { pool, query } from '../../config/db.js';

const escapeLike = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

export const BrandModel = {
  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        logo VARCHAR(500) NULL,
        description TEXT NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_brand_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  async findAll() {
    return query('SELECT * FROM brands ORDER BY name ASC, id ASC');
  },

  async findActive() {
    return query("SELECT id, name, slug, logo FROM brands WHERE status = 'active' ORDER BY name ASC, id ASC");
  },

  async findById(id) {
    const rows = await query('SELECT * FROM brands WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const rows = await query('SELECT * FROM brands WHERE slug = ? LIMIT 1', [slug]);
    return rows[0] || null;
  },

  async searchActive(q, limit) {
    const like = `%${escapeLike(q)}%`;
    return query(
      "SELECT name, slug FROM brands WHERE status = 'active' AND name LIKE ? ORDER BY name ASC LIMIT ?",
      [like, limit]
    );
  },

  async create(data) {
    const result = await query(
      'INSERT INTO brands (name, slug, logo, description, status) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.slug, data.logo, data.description, data.status]
    );
    return result.insertId;
  },

  async update(id, data) {
    const sets = [];
    const vals = [];
    for (const f of ['name', 'slug', 'logo', 'description', 'status']) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
    }
    if (!sets.length) return 0;
    const result = await query(`UPDATE brands SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return result.affectedRows;
  },

  async delete(id) {
    const result = await query('DELETE FROM brands WHERE id = ? LIMIT 1', [id]);
    return result.affectedRows;
  },
};
