import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

import { customerAuthRouter, adminAuthRouter, adminUsersRouter } from './modules/auth/auth.routes.js';
import { customersAdminRouter, addressesRouter } from './modules/users/users.routes.js';
import { productsPublicRouter, productsAdminRouter } from './modules/products/products.routes.js';
import { categoriesPublicRouter, categoriesAdminRouter } from './modules/categories/categories.routes.js';
import { brandsPublicRouter, brandsAdminRouter } from './modules/brands/brands.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { wishlistRouter } from './modules/wishlist/wishlist.routes.js';
import { ordersRouter, ordersAdminRouter } from './modules/orders/orders.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { couponsRouter, couponsAdminRouter } from './modules/coupons/coupons.routes.js';
import { reviewsRouter, reviewsAdminRouter } from './modules/reviews/reviews.routes.js';
import { bannersPublicRouter, bannersAdminRouter } from './modules/banners/banners.routes.js';
import { shippingPublicRouter, shippingAdminRouter } from './modules/shipping/shipping.routes.js';
import {
  notificationsRouter,
  notificationsAdminRouter,
  newsletterRouter,
} from './modules/notifications/notifications.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { cmsPublicRouter, cmsAdminRouter } from './modules/cms/cms.routes.js';
import { settingsPublicRouter, settingsAdminRouter } from './modules/settings/settings.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { seoPublicRouter } from './modules/seo/seo.routes.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.FRONTEND_URL === '*' ? '*' : env.FRONTEND_URL.split(',') }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- public / customer ---
app.use('/api/auth', customerAuthRouter);
app.use('/api/products', productsPublicRouter);
app.use('/api/categories', categoriesPublicRouter);
app.use('/api/brands', brandsPublicRouter);
app.use('/api/cart', cartRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/banners', bannersPublicRouter);
app.use('/api/shipping', shippingPublicRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/cms', cmsPublicRouter);
app.use('/api/settings', settingsPublicRouter);
app.use('/api', seoPublicRouter);

// --- admin ---
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/roles', rolesRouter);
app.use('/api/admin/customers', customersAdminRouter);
app.use('/api/admin/products', productsAdminRouter);
app.use('/api/admin/categories', categoriesAdminRouter);
app.use('/api/admin/brands', brandsAdminRouter);
app.use('/api/admin/coupons', couponsAdminRouter);
app.use('/api/admin/orders', ordersAdminRouter);
app.use('/api/admin/reviews', reviewsAdminRouter);
app.use('/api/admin/banners', bannersAdminRouter);
app.use('/api/admin/shipping/zones', shippingAdminRouter);
app.use('/api/admin/notifications', notificationsAdminRouter);
app.use('/api/admin/reports', reportsRouter);
app.use('/api/admin/cms', cmsAdminRouter);
app.use('/api/admin/settings', settingsAdminRouter);

// --- Serve the built storefront (single-service demo deploys, e.g. Koyeb free) ---
// Set SERVE_FRONTEND=true and build the frontend first (npm run build in frontend/)
// so the API also serves the SPA from ../frontend/dist on the same origin.
// API (/api), uploads (/uploads) and /health keep working as before.
if (process.env.SERVE_FRONTEND === 'true') {
  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
    console.log('[server] Serving storefront from', distDir);
  } else {
    console.log('[server] SERVE_FRONTEND=true but frontend/dist not found — run `npm run build` in frontend/ first');
  }
}

app.use(notFound);
app.use(errorHandler);

export default app;
