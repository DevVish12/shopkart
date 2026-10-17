import { query } from '../config/db.js';

const pad = (n, len) => String(n).padStart(len, '0');

// Generates a unique order number like EP-20260929-0001
export const generateOrderId = async () => {
  const d = new Date();
  const prefix = `EP-${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}-`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const rows = await query(
      'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1',
      [`${prefix}%`]
    );
    let seq = 1;
    if (rows.length) {
      const last = parseInt(rows[0].order_number.slice(prefix.length), 10);
      if (Number.isFinite(last)) seq = last + 1;
    }
    const candidate = `${prefix}${pad(seq, 4)}`;
    const exists = await query('SELECT id FROM orders WHERE order_number = ? LIMIT 1', [candidate]);
    if (!exists.length) return candidate;
  }
  throw new Error('Could not generate order number');
};
