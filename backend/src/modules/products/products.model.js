// Products data layer — raw SQL only. Tables: products, product_images, product_images, product_variants.
import { pool, query } from '../../config/db.js';

const LIST_SELECT = `
  SELECT p.*,
    (SELECT pi.image_url FROM product_images pi
      WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS primary_image,
    c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
    sc.id AS subcategory_id, sc.name AS subcategory_name, sc.slug AS subcategory_slug,
    b.id AS brand_id, b.name AS brand_name, b.slug AS brand_slug
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories sc ON sc.id = p.subcategory_id
  LEFT JOIN brands b ON b.id = p.brand_id
`;

const ORDER_BY = {
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
  newest: 'p.created_at DESC, p.id DESC',
  popular: 'p.sold_count DESC, p.id DESC',
  rating: 'p.rating_avg DESC, p.id DESC',
};

const escapeLike = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

function buildPublicWhere(f = {}) {
  const where = [`p.status = 'active'`];
  const params = [];
  if (f.search) {
    const like = `%${escapeLike(f.search)}%`;
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
    params.push(like, like, like);
  }
  if (f.categoryId) { where.push('p.category_id = ?'); params.push(f.categoryId); }
  if (f.subcategoryId) { where.push('p.subcategory_id = ?'); params.push(f.subcategoryId); }
  if (f.brandId) { where.push('p.brand_id = ?'); params.push(f.brandId); }
  if (f.minPrice != null) { where.push('p.price >= ?'); params.push(f.minPrice); }
  if (f.maxPrice != null) { where.push('p.price <= ?'); params.push(f.maxPrice); }
  if (f.rating != null) { where.push('p.rating_avg >= ?'); params.push(f.rating); }
  if (f.color) {
    where.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color = ?)');
    params.push(f.color);
  }
  if (f.size) {
    where.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = ?)');
    params.push(f.size);
  }
  if (f.inStock) { where.push('p.stock > 0'); }
  if (f.excludeId) { where.push('p.id != ?'); params.push(f.excludeId); }
  return { clause: where.join(' AND '), params };
}

const PRODUCT_FIELDS = [
  'name', 'slug', 'sku', 'category_id', 'subcategory_id', 'brand_id',
  'description', 'short_description', 'price', 'mrp', 'gst_percent',
  'weight_kg', 'dimensions', 'stock', 'sold_count', 'status',
  'is_featured', 'is_new_arrival', 'is_best_seller', 'is_flash_sale',
  'flash_sale_price', 'flash_sale_ends_at', 'meta_title', 'meta_description',
];

export const ProductModel = {
  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        sku VARCHAR(100) NOT NULL UNIQUE,
        category_id INT UNSIGNED NOT NULL,
        subcategory_id INT UNSIGNED NULL,
        brand_id INT UNSIGNED NULL,
        description MEDIUMTEXT NULL,
        short_description VARCHAR(500) NULL,
        price DECIMAL(10,2) NOT NULL,
        mrp DECIMAL(10,2) NOT NULL,
        gst_percent DECIMAL(5,2) DEFAULT 18,
        weight_kg DECIMAL(8,3) NULL,
        dimensions VARCHAR(100) NULL,
        stock INT NOT NULL DEFAULT 0,
        sold_count INT NOT NULL DEFAULT 0,
        rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
        rating_count INT NOT NULL DEFAULT 0,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        is_featured TINYINT NOT NULL DEFAULT 0,
        is_new_arrival TINYINT NOT NULL DEFAULT 0,
        is_best_seller TINYINT NOT NULL DEFAULT 0,
        is_flash_sale TINYINT NOT NULL DEFAULT 0,
        flash_sale_price DECIMAL(10,2) NULL,
        flash_sale_ends_at DATETIME NULL,
        meta_title VARCHAR(255) NULL,
        meta_description VARCHAR(500) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
        INDEX idx_products_category (category_id),
        INDEX idx_products_status (status),
        INDEX idx_products_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_pi_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        size VARCHAR(50) NULL,
        color VARCHAR(50) NULL,
        weight_label VARCHAR(50) NULL,
        sku VARCHAR(100) NULL,
        price DECIMAL(10,2) NULL,
        mrp DECIMAL(10,2) NULL,
        stock INT NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_pv_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  // ---- public listing ----
  async findPublicList(filters = {}, { sort = 'newest', limit = 20, offset = 0 } = {}) {
    const { clause, params } = buildPublicWhere(filters);
    const orderBy = ORDER_BY[sort] || ORDER_BY.newest;
    const rows = await query(
      `${LIST_SELECT} WHERE ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM products p WHERE ${clause}`,
      params
    );
    return { rows, total: totalRows[0].total };
  },

  async findByFlag(flag, limit, orderBy) {
    const allowed = ['is_featured', 'is_new_arrival', 'is_best_seller'];
    if (!allowed.includes(flag)) throw new Error('Invalid product flag');
    return query(
      `${LIST_SELECT} WHERE p.status = 'active' AND p.${flag} = 1 ORDER BY ${orderBy} LIMIT ?`,
      [limit]
    );
  },

  async findFlashSale(limit) {
    return query(
      `${LIST_SELECT} WHERE p.status = 'active' AND p.is_flash_sale = 1 AND p.flash_sale_ends_at > NOW() ORDER BY p.flash_sale_ends_at ASC LIMIT ?`,
      [limit]
    );
  },

  async searchNames(q, limit) {
    const like = `%${escapeLike(q)}%`;
    return query(
      `SELECT name, slug FROM products WHERE status = 'active' AND (name LIKE ? OR sku LIKE ?) ORDER BY sold_count DESC LIMIT ?`,
      [like, like, limit]
    );
  },

  // ---- single product ----
  async findBySlug(slug) {
    const rows = await query(`${LIST_SELECT} WHERE p.slug = ? LIMIT 1`, [slug]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(`${LIST_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async findBySku(sku) {
    const rows = await query('SELECT id FROM products WHERE sku = ? LIMIT 1', [sku]);
    return rows[0] || null;
  },

  // ---- admin listing ----
  async findAdminList({ search, categoryId, status, limit, offset }) {
    const where = [];
    const params = [];
    if (search) {
      const like = `%${escapeLike(search)}%`;
      where.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(like, like);
    }
    if (categoryId) { where.push('(p.category_id = ? OR p.subcategory_id = ?)'); params.push(categoryId, categoryId); }
    if (status) { where.push('p.status = ?'); params.push(status); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock, p.status, p.created_at,
        c.name AS category_name,
        (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS primary_image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${clause} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRows = await query(`SELECT COUNT(*) AS total FROM products p ${clause}`, params);
    return { rows, total: totalRows[0].total };
  },

  // ---- writes ----
  async createProduct(data) {
    const cols = [];
    const vals = [];
    for (const f of PRODUCT_FIELDS) {
      if (data[f] !== undefined) { cols.push(f); vals.push(data[f]); }
    }
    const result = await query(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
    return result.insertId;
  },

  async updateProduct(id, data) {
    const sets = [];
    const vals = [];
    for (const f of PRODUCT_FIELDS) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
    }
    if (!sets.length) return 0;
    const result = await query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return result.affectedRows;
  },

  async deleteProduct(id) {
    const result = await query('DELETE FROM products WHERE id = ? LIMIT 1', [id]);
    return result.affectedRows;
  },

  // ---- images ----
  async addImages(productId, images) {
    for (const img of images) {
      await query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', [
        productId, img.image_url, img.sort_order,
      ]);
    }
  },

  async getImages(productId) {
    return query(
      'SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [productId]
    );
  },

  async findImageById(imageId) {
    const rows = await query('SELECT id, product_id, image_url FROM product_images WHERE id = ? LIMIT 1', [imageId]);
    return rows[0] || null;
  },

  async deleteImage(imageId) {
    const result = await query('DELETE FROM product_images WHERE id = ? LIMIT 1', [imageId]);
    return result.affectedRows;
  },

  // ---- variants ----
  async addVariants(productId, variants) {
    for (const v of variants) {
      await query(
        `INSERT INTO product_variants (product_id, size, color, weight_label, sku, price, mrp, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, v.size, v.color, v.weight_label, v.sku, v.price, v.mrp, v.stock]
      );
    }
  },

  async getVariants(productId) {
    return query(
      'SELECT id, size, color, weight_label, sku, price, mrp, stock FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [productId]
    );
  },

  async deleteVariantsByProduct(productId) {
    await query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
  },
};
