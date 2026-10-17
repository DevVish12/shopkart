// Shipping zones data access. SQL only — no business logic.
import { pool, query } from '../../config/db.js';

const formatZone = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    pincodes: row.pincodes,
    charge: Number(row.charge || 0),
    free_above: row.free_above == null ? null : Number(row.free_above),
    estimated_days: row.estimated_days,
    status: row.status,
  };
};

export const ShippingModel = {
  format: formatZone,

  async ensureTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS shipping_zones (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        pincodes TEXT NOT NULL,
        charge DECIMAL(10,2) NOT NULL DEFAULT 0,
        free_above DECIMAL(10,2) NULL,
        estimated_days VARCHAR(50) NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        INDEX idx_zones_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },

  async listActive() {
    const rows = await query(
      `SELECT * FROM shipping_zones WHERE status = 'active' ORDER BY id ASC`
    );
    return rows.map(formatZone);
  },

  async listAll() {
    const rows = await query(`SELECT * FROM shipping_zones ORDER BY id ASC`);
    return rows.map(formatZone);
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM shipping_zones WHERE id = ? LIMIT 1`, [id]);
    return formatZone(rows[0] || null);
  },

  async create(data) {
    const [result] = await query(
      `INSERT INTO shipping_zones (name, pincodes, charge, free_above, estimated_days, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.pincodes,
        data.charge ?? 0,
        data.free_above ?? null,
        data.estimated_days ?? null,
        data.status || 'active',
      ]
    );
    return result.insertId;
  },

  async update(id, data) {
    const sets = [];
    const params = [];
    for (const col of ['name', 'pincodes', 'charge', 'free_above', 'estimated_days', 'status']) {
      if (data[col] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(data[col] === '' ? null : data[col]);
      }
    }
    if (!sets.length) return;
    params.push(id);
    await query(`UPDATE shipping_zones SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async remove(id) {
    await query(`DELETE FROM shipping_zones WHERE id = ?`, [id]);
  },

  async setStatus(id, status) {
    await query(`UPDATE shipping_zones SET status = ? WHERE id = ?`, [status, id]);
  },
};
