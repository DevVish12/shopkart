import { pool, query } from '../../config/db.js';

// Table: cms_pages(id, slug UNIQUE, title, content MEDIUMTEXT, status ENUM('published','draft'))
export const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      status ENUM('published','draft') NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

export const CmsModel = {
  ensureTable,

  // Public shape: only published pages expose slug/title/content.
  async findPublishedBySlug(slug) {
    const rows = await query(
      'SELECT slug, title, content FROM cms_pages WHERE slug = ? AND status = ? LIMIT 1',
      [slug, 'published']
    );
    return rows[0] || null;
  },

  async findAllPaginated(limit, offset) {
    const [rows, countRows] = await Promise.all([
      query(
        'SELECT id, slug, title, content, status, created_at, updated_at FROM cms_pages ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      ),
      query('SELECT COUNT(*) AS total FROM cms_pages'),
    ]);
    return { rows, total: countRows[0].total };
  },

  async findById(id) {
    const rows = await query(
      'SELECT id, slug, title, content, status, created_at, updated_at FROM cms_pages WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const rows = await query('SELECT id FROM cms_pages WHERE slug = ? LIMIT 1', [slug]);
    return rows[0] || null;
  },

  async slugTakenByOther(slug, id) {
    const rows = await query(
      'SELECT id FROM cms_pages WHERE slug = ? AND id <> ? LIMIT 1',
      [slug, id]
    );
    return rows.length > 0;
  },

  async create(data) {
    try {
      const result = await query(
        'INSERT INTO cms_pages (slug, title, content, status) VALUES (?, ?, ?, ?)',
        [data.slug, data.title, data.content, data.status || 'draft']
      );
      return this.findById(result.insertId);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const dup = new Error('A page with this slug already exists');
        dup.statusCode = 409;
        throw dup;
      }
      throw err;
    }
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key of ['slug', 'title', 'content', 'status']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return this.findById(id);
    values.push(id);
    try {
      await query(`UPDATE cms_pages SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const dup = new Error('A page with this slug already exists');
        dup.statusCode = 409;
        throw dup;
      }
      throw err;
    }
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM cms_pages WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};
