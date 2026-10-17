import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { pool } from './config/db.js';
import { initRealtime } from './realtime.js';

import { UserModel, OtpModel, AdminUserModel } from './modules/auth/auth.model.js';
import { ensureTable as ensureUsersTables } from './modules/users/users.model.js';
import { CategoryModel } from './modules/categories/categories.model.js';
import { BrandModel } from './modules/brands/brands.model.js';
import { ProductModel } from './modules/products/products.model.js';
import { CartModel } from './modules/cart/cart.model.js';
import { WishlistModel } from './modules/wishlist/wishlist.model.js';
import { CouponModel } from './modules/coupons/coupons.model.js';
import { OrderModel } from './modules/orders/orders.model.js';
import { PaymentModel } from './modules/payments/payments.model.js';
import { ReviewModel } from './modules/reviews/reviews.model.js';
import { BannerModel } from './modules/banners/banners.model.js';
import { ShippingModel } from './modules/shipping/shipping.model.js';
import { NotificationModel } from './modules/notifications/notifications.model.js';
import { ensureTable as ensureReportsTables } from './modules/reports/reports.model.js';
import { CmsModel } from './modules/cms/cms.model.js';
import { SettingsModel } from './modules/settings/settings.model.js';
import { RoleModel } from './modules/roles/roles.model.js';

// FK-safe creation order. Every model runs CREATE TABLE IF NOT EXISTS.
const models = [
  ['users', () => UserModel.ensureTable()],
  ['otps', () => OtpModel.ensureTable()],
  ['admin_users', () => AdminUserModel.ensureTable()],
  ['roles', async () => {
    await RoleModel.ensureTable();
    await RoleModel.seedDefaults();
    await RoleModel.migrateAdminUsers();
  }],
  ['users(admin)', ensureUsersTables],
  ['categories', () => CategoryModel.ensureTable()],
  ['brands', () => BrandModel.ensureTable()],
  ['products', () => ProductModel.ensureTable()],
  ['carts', () => CartModel.ensureTable()],
  ['wishlists', () => WishlistModel.ensureTable()],
  ['coupons', () => CouponModel.ensureTable()],
  ['orders', () => OrderModel.ensureTable()],
  ['payments', () => PaymentModel.ensureTable()],
  ['reviews', () => ReviewModel.ensureTable()],
  ['banners', () => BannerModel.ensureTable()],
  ['shipping_zones', () => ShippingModel.ensureTable()],
  ['notifications', () => NotificationModel.ensureTable()],
  ['reports', ensureReportsTables],
  ['cms_pages', () => CmsModel.ensureTable()],
  ['settings', () => SettingsModel.ensureTable()],
];

const start = async () => {
  await pool.query('SELECT 1');
  console.log('[db] MySQL connected');

  for (const [name, ensure] of models) {
    await ensure();
    console.log(`[db] table ensured: ${name}`);
  }

  const httpServer = http.createServer(app);
  initRealtime(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`[server] API ready at http://localhost:${env.PORT}/api`);
    console.log(`[server] Health check: http://localhost:${env.PORT}/health`);
    console.log(`[server] Realtime (socket.io) ready`);
  });

  // Graceful shutdown: stop accepting connections, then close the DB pool.
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received — shutting down…`);
    server.close(async () => {
      try {
        await pool.end();
        console.log('[server] DB pool closed');
      } catch (e) {
        console.error('[server] error closing pool:', e.message);
      }
      process.exit(0);
    });
    // Force exit if connections hang.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  if (/foreign key|incompatible|errno:? 150|3780/i.test(err.message)) {
    console.error(
      '[server] hint: this usually means the database already contains tables from a different/older schema. ' +
        'Drop and recreate the database (DROP DATABASE <name>; CREATE DATABASE <name>;), then start again.'
    );
  }
  process.exit(1);
});
