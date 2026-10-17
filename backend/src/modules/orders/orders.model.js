// Orders data access. SQL only — no business logic.
import { pool, query } from '../../config/db.js';

const parseAddress = (snapshot) => {
  if (!snapshot) return null;
  if (typeof snapshot === 'object') return snapshot;
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
};

const formatOrder = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    address_id: row.address_id,
    address_snapshot: row.address_snapshot,
    address: parseAddress(row.address_snapshot),
    items_subtotal: Number(row.items_subtotal || 0),
    discount_amount: Number(row.discount_amount || 0),
    coupon_id: row.coupon_id,
    coupon_code: row.coupon_code,
    shipping_charge: Number(row.shipping_charge || 0),
    tax_amount: Number(row.tax_amount || 0),
    grand_total: Number(row.grand_total || 0),
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    order_status: row.order_status,
    tracking_number: row.tracking_number,
    customer_notes: row.customer_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const formatItem = (row) => ({
  id: row.id,
  order_id: row.order_id,
  product_id: row.product_id,
  variant_id: row.variant_id,
  product_name: row.product_name,
  variant_label: row.variant_label,
  sku: row.sku,
  qty: Number(row.qty || 0),
  price: Number(row.price || 0),
  mrp: row.mrp == null ? null : Number(row.mrp),
  image_url: row.image_url,
});

export const OrderModel = {
  format: formatOrder,
  formatItem,

  async ensureTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        user_id INT UNSIGNED NOT NULL,
        address_id INT UNSIGNED NOT NULL,
        address_snapshot JSON NULL,
        items_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        coupon_id INT UNSIGNED NULL,
        coupon_code VARCHAR(50) NULL,
        shipping_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(10,2) NOT NULL,
        payment_method ENUM('cod','razorpay','upi','card','netbanking','wallet') NOT NULL DEFAULT 'cod',
        payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
        order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
        tracking_number VARCHAR(100) NULL,
        customer_notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_user (user_id),
        INDEX idx_orders_status (order_status),
        INDEX idx_orders_number (order_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        product_id INT UNSIGNED NOT NULL,
        variant_id INT UNSIGNED NULL,
        product_name VARCHAR(255) NOT NULL,
        variant_label VARCHAR(255) NULL,
        sku VARCHAR(100) NULL,
        qty INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        mrp DECIMAL(10,2) NULL,
        image_url VARCHAR(500) NULL,
        INDEX idx_order_items_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        status VARCHAR(30) NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_osh_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('requested','approved','rejected','refunded') NOT NULL DEFAULT 'requested',
        refund_status VARCHAR(30) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_returns_order (order_id),
        INDEX idx_returns_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },

  async create(data, db = pool) {
    const [result] = await db.query(
      `INSERT INTO orders
         (user_id, address_id, order_number, address_snapshot, items_subtotal, discount_amount,
          coupon_id, coupon_code, shipping_charge, tax_amount, grand_total, payment_method,
          payment_status, order_status, customer_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?)`,
      [
        data.userId,
        data.addressId,
        data.orderNumber,
        typeof data.addressSnapshot === 'string'
          ? data.addressSnapshot
          : JSON.stringify(data.addressSnapshot || {}),
        data.itemsSubtotal,
        data.discountAmount,
        data.couponId ?? null,
        data.couponCode ?? null,
        data.shippingCharge,
        data.taxAmount,
        data.grandTotal,
        data.paymentMethod,
        data.customerNotes ?? null,
      ]
    );
    return result.insertId;
  },

  async addItems(orderId, items, db = pool) {
    if (!items.length) return;
    const rows = items.map((it) => [
      orderId,
      it.productId,
      it.variantId ?? null,
      it.productName,
      it.variantLabel ?? null,
      it.sku ?? null,
      it.qty,
      it.price,
      it.mrp ?? null,
      it.imageUrl ?? null,
    ]);
    await db.query(
      `INSERT INTO order_items
         (order_id, product_id, variant_id, product_name, variant_label, sku, qty, price, mrp, image_url)
       VALUES ?`,
      [rows]
    );
  },

  // Returns affected rows; 0 means the stock guard (stock >= qty) failed.
  async decrementProductStock(productId, qty, db = pool) {
    const [result] = await db.query(
      `UPDATE products SET stock = stock - ?, sold_count = sold_count + ?
       WHERE id = ? AND stock >= ?`,
      [qty, qty, productId, qty]
    );
    return result.affectedRows;
  },

  async decrementVariantStock(variantId, qty, db = pool) {
    const [result] = await db.query(
      `UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?`,
      [qty, variantId, qty]
    );
    return result.affectedRows;
  },

  async restockProduct(productId, qty, db = pool) {
    await db.query(
      `UPDATE products SET stock = stock + ?, sold_count = GREATEST(sold_count - ?, 0) WHERE id = ?`,
      [qty, qty, productId]
    );
  },

  async restockVariant(variantId, qty, db = pool) {
    await db.query(`UPDATE product_variants SET stock = stock + ? WHERE id = ?`, [qty, variantId]);
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
    return formatOrder(rows[0] || null);
  },

  async listForUser(userId, { status, limit, offset }) {
    const params = [userId];
    let where = `o.user_id = ?`;
    if (status) {
      where += ` AND o.order_status = ?`;
      params.push(status);
    }
    params.push(limit, offset);
    const rows = await query(
      `SELECT o.id, o.order_number, o.grand_total, o.order_status, o.payment_status, o.created_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS itemCount,
              (SELECT oi2.image_url FROM order_items oi2 WHERE oi2.order_id = o.id ORDER BY oi2.id ASC LIMIT 1) AS primaryImage
       FROM orders o
       WHERE ${where}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows.map((r) => ({
      ...r,
      grand_total: Number(r.grand_total || 0),
      itemCount: Number(r.itemCount || 0),
    }));
  },

  async countForUser(userId, { status }) {
    const params = [userId];
    let where = `user_id = ?`;
    if (status) {
      where += ` AND order_status = ?`;
      params.push(status);
    }
    const rows = await query(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`, params);
    return Number(rows[0]?.total || 0);
  },

  async listForAdmin({ status, search, limit, offset }) {
    const params = [];
    const conds = [];
    if (status) {
      conds.push(`o.order_status = ?`);
      params.push(status);
    }
    if (search) {
      conds.push(`(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);
    const rows = await query(
      `SELECT o.id, o.order_number, o.grand_total, o.order_status, o.payment_status, o.created_at,
              u.name AS customer_name, u.email AS customer_email,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS itemCount
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows.map((r) => ({
      ...r,
      grand_total: Number(r.grand_total || 0),
      itemCount: Number(r.itemCount || 0),
    }));
  },

  async countForAdmin({ status, search }) {
    const params = [];
    const conds = [];
    if (status) {
      conds.push(`o.order_status = ?`);
      params.push(status);
    }
    if (search) {
      conds.push(`(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = await query(
      `SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id ${where}`,
      params
    );
    return Number(rows[0]?.total || 0);
  },

  async getItems(orderId) {
    const rows = await query(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`, [orderId]);
    return rows.map(formatItem);
  },

  async addHistory(orderId, status, note = null, db = pool) {
    await db.query(`INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`, [
      orderId,
      status,
      note,
    ]);
  },

  async getHistory(orderId) {
    return query(
      `SELECT id, status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY id ASC`,
      [orderId]
    );
  },

  async setStatus(orderId, { orderStatus, paymentStatus, trackingNumber } = {}, db = pool) {
    const sets = [];
    const params = [];
    if (orderStatus !== undefined) {
      sets.push(`order_status = ?`);
      params.push(orderStatus);
    }
    if (paymentStatus !== undefined) {
      sets.push(`payment_status = ?`);
      params.push(paymentStatus);
    }
    if (trackingNumber !== undefined) {
      sets.push(`tracking_number = ?`);
      params.push(trackingNumber);
    }
    if (!sets.length) return;
    params.push(orderId);
    await db.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async createReturn({ orderId, userId, reason }, db = pool) {
    const [result] = await db.query(
      `INSERT INTO order_returns (order_id, user_id, reason, status) VALUES (?, ?, ?, 'requested')`,
      [orderId, userId, reason]
    );
    return result.insertId;
  },

  async getActiveReturn(orderId) {
    const rows = await query(
      `SELECT * FROM order_returns
       WHERE order_id = ? AND status IN ('requested', 'approved')
       ORDER BY id DESC LIMIT 1`,
      [orderId]
    );
    return rows[0] || null;
  },
};
