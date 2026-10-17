import { pool, query } from '../../config/db.js';

const num = (v) => (v === null || v === undefined ? null : Number(v));

export const CartModel = {
  async ensureTable() {
    await query(`CREATE TABLE IF NOT EXISTS carts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await query(`CREATE TABLE IF NOT EXISTS cart_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      cart_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      variant_id INT UNSIGNED NULL,
      qty INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      INDEX idx_cart_items_cart (cart_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  // Exact shape consumed by the orders module — keep keys as specified.
  async getCartWithItems(userId) {
    const carts = await query('SELECT id, user_id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    const cart = carts[0] || null;
    if (!cart) return { cart: null, items: [] };

    const rows = await query(
      `SELECT ci.id, ci.product_id, ci.variant_id, ci.qty, ci.price,
              p.id AS p_id, p.name AS p_name, p.slug AS p_slug, p.sku AS p_sku,
              p.price AS p_price, p.mrp AS p_mrp, p.stock AS p_stock, p.status AS p_status,
              p.category_id AS p_category_id, p.is_flash_sale AS p_is_flash_sale,
              p.flash_sale_price AS p_flash_sale_price, p.flash_sale_ends_at AS p_flash_sale_ends_at,
              pi.image_url AS primary_image,
              v.id AS v_id, v.size AS v_size, v.color AS v_color,
              v.weight_label AS v_weight_label, v.sku AS v_sku,
              v.price AS v_price, v.mrp AS v_mrp, v.stock AS v_stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_variants v ON v.id = ci.variant_id
       LEFT JOIN product_images pi
         ON pi.product_id = p.id
         AND pi.sort_order = (SELECT MIN(sort_order) FROM product_images WHERE product_id = p.id)
       WHERE ci.cart_id = ?
       ORDER BY ci.id ASC`,
      [cart.id]
    );

    const items = rows.map((r) => ({
      id: Number(r.id),
      product_id: Number(r.product_id),
      variant_id: r.variant_id == null ? null : Number(r.variant_id),
      qty: Number(r.qty),
      price: Number(r.price),
      product: {
        id: Number(r.p_id),
        name: r.p_name,
        slug: r.p_slug,
        sku: r.p_sku,
        price: Number(r.p_price),
        mrp: Number(r.p_mrp),
        stock: Number(r.p_stock),
        status: r.p_status,
        category_id: r.p_category_id == null ? null : Number(r.p_category_id),
        is_flash_sale: Number(r.p_is_flash_sale) === 1 ? 1 : 0,
        flash_sale_price: num(r.p_flash_sale_price),
        flash_sale_ends_at: r.p_flash_sale_ends_at,
        primary_image: r.primary_image || null,
      },
      variant:
        r.v_id == null
          ? null
          : {
              id: Number(r.v_id),
              size: r.v_size,
              color: r.v_color,
              weight_label: r.v_weight_label,
              sku: r.v_sku,
              price: num(r.v_price),
              mrp: num(r.v_mrp),
              stock: Number(r.v_stock),
            },
    }));

    return { cart: { id: Number(cart.id), user_id: Number(cart.user_id) }, items };
  },

  async clearCart(userId) {
    const carts = await query('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    if (carts[0]) await query('DELETE FROM carts WHERE id = ?', [carts[0].id]);
  },

  // ---------- helpers for the cart service ----------

  async getOrCreateCart(userId) {
    const rows = await query('SELECT id, user_id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    if (rows[0]) return { id: Number(rows[0].id), user_id: Number(rows[0].user_id) };
    const result = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    return { id: Number(result[0].insertId), user_id: Number(userId) };
  },

  async findLine(cartId, productId, variantId) {
    const rows = await query(
      `SELECT * FROM cart_items
       WHERE cart_id = ? AND product_id = ? AND
             ${variantId == null ? 'variant_id IS NULL' : 'variant_id = ?'}
       LIMIT 1`,
      variantId == null ? [cartId, productId] : [cartId, productId, variantId]
    );
    return rows[0] || null;
  },

  async findItemById(itemId) {
    const rows = await query(
      `SELECT ci.*, c.user_id FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? LIMIT 1`,
      [itemId]
    );
    return rows[0] || null;
  },

  async createItem({ cartId, productId, variantId, qty, price }) {
    const result = await pool.query(
      'INSERT INTO cart_items (cart_id, product_id, variant_id, qty, price) VALUES (?, ?, ?, ?, ?)',
      [cartId, productId, variantId, qty, price]
    );
    return result[0].insertId;
  },

  async updateItemQty(itemId, qty) {
    await query('UPDATE cart_items SET qty = ? WHERE id = ?', [qty, itemId]);
  },

  async deleteItem(itemId) {
    await query('DELETE FROM cart_items WHERE id = ?', [itemId]);
  },

  async findProduct(productId) {
    const rows = await query(
      `SELECT id, name, slug, sku, price, mrp, stock, status, category_id,
              is_flash_sale, flash_sale_price, flash_sale_ends_at
       FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );
    return rows[0] || null;
  },

  async findVariant(variantId) {
    const rows = await query('SELECT * FROM product_variants WHERE id = ? LIMIT 1', [variantId]);
    return rows[0] || null;
  },

  // Rows shaped for toListItem(): carries primary_image, category_* and brand_* aliases.
  async getDisplayItems(userId) {
    return query(
      `SELECT ci.id AS item_id, ci.qty, ci.price AS line_price, ci.product_id, ci.variant_id,
              p.id, p.name, p.slug, p.sku, p.price, p.mrp,
              p.rating_avg, p.rating_count, p.stock,
              p.is_new_arrival, p.is_best_seller, p.is_flash_sale,
              p.flash_sale_price, p.flash_sale_ends_at,
              pi.image_url AS primary_image,
              p.category_id, c.name AS category_name, c.slug AS category_slug,
              p.brand_id, b.name AS brand_name, b.slug AS brand_slug,
              v.id AS v_id, v.size AS v_size, v.color AS v_color,
              v.weight_label AS v_weight_label, v.sku AS v_sku,
              v.price AS v_price, v.mrp AS v_mrp, v.stock AS v_stock
       FROM carts ct
       JOIN cart_items ci ON ci.cart_id = ct.id
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN product_variants v ON v.id = ci.variant_id
       LEFT JOIN product_images pi
         ON pi.product_id = p.id
         AND pi.sort_order = (SELECT MIN(sort_order) FROM product_images WHERE product_id = p.id)
       WHERE ct.user_id = ?
       ORDER BY ci.id ASC`,
      [userId]
    );
  },
};
