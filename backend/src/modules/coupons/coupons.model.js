// Coupons data access. SQL only — no business logic.
import { pool, query } from '../../config/db.js';

const parseIdList = (v) => {
  if (v == null) return null;
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(parsed) ? parsed.map(Number) : null;
  } catch {
    return null;
  }
};

const formatCoupon = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value || 0),
    min_order_amount: Number(row.min_order_amount || 0),
    max_discount: row.max_discount == null ? null : Number(row.max_discount),
    usage_limit: row.usage_limit == null ? null : Number(row.usage_limit),
    used_count: Number(row.used_count || 0),
    first_order_only: Number(row.first_order_only || 0),
    applicable_products: parseIdList(row.applicable_products),
    applicable_categories: parseIdList(row.applicable_categories),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
  };
};

export const CouponModel = {
  format: formatCoupon,

  async ensureTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('percentage','flat') NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        max_discount DECIMAL(10,2) NULL,
        usage_limit INT NULL,
        used_count INT NOT NULL DEFAULT 0,
        first_order_only TINYINT NOT NULL DEFAULT 0,
        applicable_products JSON NULL,
        applicable_categories JSON NULL,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        INDEX idx_coupons_code (code),
        INDEX idx_coupons_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        coupon_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        order_id INT UNSIGNED NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cu_coupon (coupon_id),
        INDEX idx_cu_user (user_id),
        INDEX idx_cu_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },

  async findByCode(code) {
    const rows = await query(`SELECT * FROM coupons WHERE code = ? LIMIT 1`, [
      String(code).trim().toUpperCase(),
    ]);
    return formatCoupon(rows[0] || null);
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM coupons WHERE id = ? LIMIT 1`, [id]);
    return formatCoupon(rows[0] || null);
  },

  async list({ limit, offset }) {
    const rows = await query(`SELECT * FROM coupons ORDER BY id DESC LIMIT ? OFFSET ?`, [
      limit,
      offset,
    ]);
    return rows.map(formatCoupon);
  },

  async count() {
    const rows = await query(`SELECT COUNT(*) AS total FROM coupons`);
    return Number(rows[0]?.total || 0);
  },

  // Public: currently-valid coupons with only customer-safe fields.
  async listActivePublic(limit = 10) {
    const rows = await query(
      `SELECT code, type, value, min_order_amount, max_discount, first_order_only
       FROM coupons
       WHERE status = 'active'
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r) => ({
      code: r.code,
      type: r.type,
      value: Number(r.value || 0),
      min_order_amount: Number(r.min_order_amount || 0),
      max_discount: r.max_discount == null ? null : Number(r.max_discount),
      first_order_only: Number(r.first_order_only || 0),
    }));
  },

  async create(data) {
    const [result] = await query(
      `INSERT INTO coupons
         (code, type, value, min_order_amount, max_discount, usage_limit, first_order_only,
          applicable_products, applicable_categories, starts_at, ends_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        data.type,
        data.value,
        data.min_order_amount ?? 0,
        data.max_discount ?? null,
        data.usage_limit ?? null,
        data.first_order_only ? 1 : 0,
        data.applicable_products ?? null,
        data.applicable_categories ?? null,
        data.starts_at || null,
        data.ends_at || null,
        data.status || 'active',
      ]
    );
    return result.insertId;
  },

  async update(id, data) {
    const sets = [];
    const params = [];
    const cols = [
      'code',
      'type',
      'value',
      'min_order_amount',
      'max_discount',
      'usage_limit',
      'first_order_only',
      'applicable_products',
      'applicable_categories',
      'starts_at',
      'ends_at',
      'status',
    ];
    for (const col of cols) {
      if (data[col] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(data[col] === '' ? null : data[col]);
      }
    }
    if (!sets.length) return;
    params.push(id);
    await query(`UPDATE coupons SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async remove(id) {
    await query(`DELETE FROM coupons WHERE id = ?`, [id]);
  },

  async setStatus(id, status) {
    await query(`UPDATE coupons SET status = ? WHERE id = ?`, [status, id]);
  },

  async incrementUsedCount(id, db = pool) {
    await db.query(`UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`, [id]);
  },

  async recordUsage({ couponId, userId, orderId, discountAmount }, db = pool) {
    const [result] = await db.query(
      `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
       VALUES (?, ?, ?, ?)`,
      [couponId, userId, orderId, discountAmount]
    );
    return result.insertId;
  },

  async usageForCoupon(couponId) {
    const rows = await query(
      `SELECT cu.id, cu.user_id, u.name AS user_name, cu.order_id, o.order_number,
              cu.discount_amount, cu.created_at
       FROM coupon_usage cu
       LEFT JOIN users u ON u.id = cu.user_id
       LEFT JOIN orders o ON o.id = cu.order_id
       WHERE cu.coupon_id = ?
       ORDER BY cu.id DESC`,
      [couponId]
    );
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      order_id: r.order_id,
      order_number: r.order_number,
      discount_amount: Number(r.discount_amount || 0),
      created_at: r.created_at,
    }));
  },
};
