import { Router } from 'express';
import { query } from '../../config/db.js';
import env from '../../config/env.js';

// ---- Public: GET /api/sitemap.xml — dynamic sitemap built from live catalog ----
// Submit https://<your-domain>/api/sitemap.xml in Google Search Console.
export const seoPublicRouter = Router();

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

seoPublicRouter.get('/sitemap.xml', async (req, res) => {
  try {
    // Storefront origin for canonical URLs (set FRONTEND_URL in backend .env).
    const base = (env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    const [products, categories] = await Promise.all([
      query(`SELECT slug, updated_at FROM products WHERE status = 'active' ORDER BY id DESC LIMIT 5000`).catch(() => []),
      query(`SELECT slug FROM categories WHERE status = 'active' ORDER BY sort_order ASC`).catch(() => []),
    ]);

    const urls = [
      { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${base}/products`, changefreq: 'daily', priority: '0.9' },
      { loc: `${base}/categories`, changefreq: 'weekly', priority: '0.7' },
      ...categories.map((c) => ({
        loc: `${base}/products?category=${esc(c.slug)}`,
        changefreq: 'weekly',
        priority: '0.7',
      })),
      ...products.map((p) => ({
        loc: `${base}/products/${esc(p.slug)}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
      })),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url><loc>${u.loc}</loc>` +
            (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
            `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
        )
        .join('\n') +
      `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`);
  }
});
