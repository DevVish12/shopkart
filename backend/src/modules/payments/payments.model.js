// Payments data access. SQL only — no business logic.
import { pool, query } from '../../config/db.js';

const formatPayment = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    order_id: row.order_id,
    provider: row.provider,
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id,
    razorpay_signature: row.razorpay_signature,
    amount: Number(row.amount || 0),
    currency: row.currency,
    status: row.status,
    created_at: row.created_at,
  };
};

const FIELD_MAP = {
  provider: 'provider',
  razorpayOrderId: 'razorpay_order_id',
  razorpayPaymentId: 'razorpay_payment_id',
  razorpaySignature: 'razorpay_signature',
  status: 'status',
  rawResponse: 'raw_response',
};

export const PaymentModel = {
  format: formatPayment,

  async ensureTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        provider ENUM('cod','razorpay') NOT NULL DEFAULT 'cod',
        razorpay_order_id VARCHAR(100) NULL,
        razorpay_payment_id VARCHAR(100) NULL,
        razorpay_signature VARCHAR(255) NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
        raw_response JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payments_order (order_id),
        INDEX idx_payments_rzp_order (razorpay_order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },

  async create(data, db = pool) {
    const [result] = await db.query(
      `INSERT INTO payments (order_id, provider, razorpay_order_id, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.orderId,
        data.provider,
        data.razorpayOrderId ?? null,
        data.amount,
        data.currency || 'INR',
        data.status || 'pending',
      ]
    );
    return result.insertId;
  },

  async findLatestByOrder(orderId) {
    const rows = await query(
      `SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
      [orderId]
    );
    return formatPayment(rows[0] || null);
  },

  async findByRazorpayOrderId(razorpayOrderId) {
    const rows = await query(
      `SELECT * FROM payments WHERE razorpay_order_id = ? ORDER BY id DESC LIMIT 1`,
      [razorpayOrderId]
    );
    return formatPayment(rows[0] || null);
  },

  async update(id, fields, db = pool) {
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(FIELD_MAP)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(
          key === 'rawResponse' && typeof fields[key] !== 'string'
            ? JSON.stringify(fields[key])
            : fields[key]
        );
      }
    }
    if (!sets.length) return;
    params.push(id);
    await db.query(`UPDATE payments SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  // Marks the latest payment row of an order (e.g. cod collected on delivery, refund issued).
  async setLatestStatus(orderId, status, db = pool) {
    const latest = await this.findLatestByOrder(orderId);
    if (!latest) return;
    await this.update(latest.id, { status }, db);
  },
};
