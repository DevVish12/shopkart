// Categories data layer — raw SQL only. Self-FK parent_id ON DELETE SET NULL.
import { pool, query } from '../../config/db.js';

const escapeLike = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

export const CategoryModel = {
  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        parent_id INT UNSIGNED NULL,
        image VARCHAR(500) NULL,
        description TEXT NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        INDEX idx_cat_parent (parent_id),
        INDEX idx_cat_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  async findAll() {
    return query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  },

  async findActive() {
    return query("SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order ASC, id ASC");
  },

  async findActiveChildren(parentId) {
    return query(
      "SELECT * FROM categories WHERE parent_id = ? AND status = 'active' ORDER BY sort_order ASC, id ASC",
      [parentId]
    );
  },

  async findById(id) {
    const rows = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const rows = await query('SELECT * FROM categories WHERE slug = ? LIMIT 1', [slug]);
    return rows[0] || null;
  },

  async searchActive(q, limit) {
    const like = `%${escapeLike(q)}%`;
    return query(
      "SELECT name, slug FROM categories WHERE status = 'active' AND name LIKE ? ORDER BY sort_order ASC LIMIT ?",
      [like, limit]
    );
  },

  async countChildren(id) {
    const rows = await query('SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?', [id]);
    return rows[0].total;
  },

  async countProducts(id) {
    const rows = await query(
      'SELECT COUNT(*) AS total FROM products WHERE category_id = ? OR subcategory_id = ?',
      [id, id]
    );
    return rows[0].total;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO categories (name, slug, parent_id, image, description, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.slug, data.parent_id, data.image, data.description, data.status, data.sort_order]
    );
    return result.insertId;
  },

  async update(id, data) {
    const sets = [];
    const vals = [];
    for (const f of ['name', 'slug', 'parent_id', 'image', 'description', 'status', 'sort_order']) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
    }
    if (!sets.length) return 0;
    const result = await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return result.affectedRows;
  },

  async delete(id) {
    const result = await query('DELETE FROM categories WHERE id = ? LIMIT 1', [id]);
    return result.affectedRows;
  },
};
