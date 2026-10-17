// Resets the database to a clean slate: drops EVERY table in the
// configured database, then re-creates all tables from the current
// model DDL. Useful when the schema changed or stale tables from an
// older version exist. WARNING: all data is deleted.
// Usage: npm run db:fresh
import { pool, query } from '../src/config/db.js';
import { ensureAllTables } from './ensure-tables.js';

const main = async () => {
  console.log('[fresh] dropping all tables...');
  await query('SET FOREIGN_KEY_CHECKS = 0');
  const rows = await query(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  for (const r of rows) {
    await query(`DROP TABLE IF EXISTS \`${r.t}\``);
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`[fresh] dropped ${rows.length} table(s)`);

  await ensureAllTables();
  console.log('[fresh] all tables re-created from current schema');
  await pool.end();
};

main().catch((err) => {
  console.error('[fresh] failed:', err.message);
  process.exit(1);
});
