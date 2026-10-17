import { pool, query } from '../../config/db.js';

export const WishlistModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS wishlists (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY uq_wishlists_user_product (user_id, product_id),
      INDEX idx_wishlists_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async exists(userId, productId) {
    const rows = await query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1',
      [userId, productId]
    );
    return !!rows[0];
  },

  async add(userId, productId) {
    await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [
      userId,
      productId,
    ]);
  },

  async remove(userId, productId) {
    await query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
  },

  async findProduct(productId) {
    const rows = await query(
      'SELECT id, status FROM products WHERE id = ? LIMIT 1',
      [productId]
    );
    return rows[0] || null;
  },

  // Active products only, rows shaped for toListItem().
  async listForUser(userId) {
    return query(
      `SELECT p.id, p.name, p.slug, p.sku, p.price, p.mrp,
              p.rating_avg, p.rating_count, p.stock,
              p.is_new_arrival, p.is_best_seller, p.is_flash_sale,
              p.flash_sale_price, p.flash_sale_ends_at,
              pi.image_url AS primary_image,
              p.category_id, c.name AS category_name, c.slug AS category_slug,
              p.brand_id, b.name AS brand_name, b.slug AS brand_slug,
              w.created_at AS wishlisted_at
       FROM wishlists w
       JOIN products p ON p.id = w.product_id AND p.status = 'active'
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN product_images pi
         ON pi.product_id = p.id
         AND pi.sort_order = (SELECT MIN(sort_order) FROM product_images WHERE product_id = p.id)
       WHERE w.user_id = ?
       ORDER BY w.id DESC`,
      [userId]
    );
  },
};
