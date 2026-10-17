// Reviews data layer — raw SQL only. Tables: reviews, review_images.
import { pool, query } from '../../config/db.js';

const REVIEW_SELECT = `
  SELECT r.*,
    p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
    u.id AS user_id, u.name AS user_name
  FROM reviews r
  LEFT JOIN products p ON p.id = r.product_id
  LEFT JOIN users u ON u.id = r.user_id
`;

export const ReviewModel = {
  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title VARCHAR(255) NULL,
        comment TEXT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_reviews_product (product_id),
        INDEX idx_reviews_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_images (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        INDEX idx_ri_review (review_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  async create(data) {
    const result = await query(
      'INSERT INTO reviews (product_id, user_id, rating, title, comment, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.product_id, data.user_id, data.rating, data.title, data.comment, data.status || 'pending']
    );
    return result.insertId;
  },

  async findById(id) {
    const rows = await query(`${REVIEW_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async update(id, data) {
    const sets = [];
    const vals = [];
    for (const f of ['rating', 'title', 'comment', 'status']) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
    }
    if (!sets.length) return 0;
    const result = await query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return result.affectedRows;
  },

  async delete(id) {
    const result = await query('DELETE FROM reviews WHERE id = ? LIMIT 1', [id]);
    return result.affectedRows;
  },

  // ---- approved reviews for a product page ----
  async findApprovedByProduct(productId, { sort = 'recent', limit = 20, offset = 0 } = {}) {
    const orderBy = sort === 'helpful' ? 'r.rating DESC, r.created_at DESC' : 'r.created_at DESC';
    const rows = await query(
      `SELECT r.id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.status = 'approved'
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );
    const totalRows = await query(
      "SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'approved'",
      [productId]
    );
    return { rows, total: totalRows[0].total };
  },

  async summaryByProduct(productId) {
    const agg = await query(
      "SELECT ROUND(COALESCE(AVG(rating), 0), 2) AS avg, COUNT(*) AS count FROM reviews WHERE product_id = ? AND status = 'approved'",
      [productId]
    );
    const buckets = await query(
      "SELECT rating, COUNT(*) AS n FROM reviews WHERE product_id = ? AND status = 'approved' GROUP BY rating",
      [productId]
    );
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    buckets.forEach((b) => {
      counts[b.rating] = b.n;
    });
    return { avg: Number(agg[0].avg), count: agg[0].count, buckets: counts };
  },

  // ---- admin listing ----
  async findAdminList({ status, limit, offset }) {
    const where = [];
    const params = [];
    if (status) { where.push('r.status = ?'); params.push(status); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `${REVIEW_SELECT} ${clause} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRows = await query(`SELECT COUNT(*) AS total FROM reviews r ${clause}`, params);
    return { rows, total: totalRows[0].total };
  },

  // ---- review images ----
  async addImages(reviewId, imageUrls) {
    for (const url of imageUrls) {
      await query('INSERT INTO review_images (review_id, image_url) VALUES (?, ?)', [reviewId, url]);
    }
  },

  async getImagesByReviewIds(reviewIds) {
    if (!reviewIds.length) return [];
    const placeholders = reviewIds.map(() => '?').join(', ');
    return query(
      `SELECT review_id, image_url FROM review_images WHERE review_id IN (${placeholders}) ORDER BY id ASC`,
      reviewIds
    );
  },

  // ---- product rating rollup ----
  async recalcProductRating(productId) {
    await query(
      `UPDATE products
       SET rating_avg = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM reviews WHERE product_id = ? AND status = 'approved'),
           rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND status = 'approved')
       WHERE id = ?`,
      [productId, productId, productId]
    );
  },
};
