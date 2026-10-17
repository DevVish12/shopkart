import { pool, query } from '../../config/db.js';

// Table: settings(`key` VARCHAR(100) UNIQUE, `value` TEXT, `group` VARCHAR(50) DEFAULT 'general')
export const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
      \`value\` TEXT NULL,
      \`group\` VARCHAR(50) NOT NULL DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

// Key/value store. All values are stored as strings; callers cast as needed.
// Critical consumer: utils/orderTotals.js -> SettingsModel.get('tax_percent', 18)
export class SettingsModel {
  static ensureTable = ensureTable;

  static async get(key, fallback = null) {
    const rows = await query('SELECT `value` FROM settings WHERE `key` = ? LIMIT 1', [key]);
    if (!rows.length) return fallback;
    const v = rows[0].value;
    return v === null || v === undefined ? fallback : v;
  }

  static async getAll() {
    const rows = await query('SELECT `key`, `value` FROM settings');
    const out = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  static async set(key, value, group = 'general') {
    const stored = value === null || value === undefined ? null : String(value);
    await query(
      `INSERT INTO settings (\`key\`, \`value\`, \`group\`) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`group\` = VALUES(\`group\`)`,
      [key, stored, group]
    );
    return true;
  }

  static async setMany(entries) {
    // entries: [{ key, value, group }]
    if (!entries.length) return 0;
    const values = entries.map((e) => [
      e.key,
      e.value === null || e.value === undefined ? null : String(e.value),
      e.group || 'general',
    ]);
    await query(
      `INSERT INTO settings (\`key\`, \`value\`, \`group\`) VALUES ?
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`group\` = VALUES(\`group\`)`,
      [values]
    );
    return values.length;
  }
}
