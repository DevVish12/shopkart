import { query } from '../config/db.js';

export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Returns a slug unique within `table` (products | categories | brands).
export const uniqueSlug = async (table, base, excludeId = null) => {
  const baseSlug = slugify(base) || 'item';
  let slug = baseSlug;
  let i = 2;
  for (;;) {
    const rows = excludeId
      ? await query(`SELECT id FROM ${table} WHERE slug = ? AND id != ? LIMIT 1`, [slug, excludeId])
      : await query(`SELECT id FROM ${table} WHERE slug = ? LIMIT 1`, [slug]);
    if (!rows.length) return slug;
    slug = `${baseSlug}-${i}`;
    i += 1;
  }
};
