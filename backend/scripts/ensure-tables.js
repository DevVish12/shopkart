// Shared table bootstrap — same ensure order as src/server.js.
// Used by scripts/seed.js and scripts/fresh.js so both always run
// against the current model DDL.
import { UserModel, OtpModel, AdminUserModel } from '../src/modules/auth/auth.model.js';
import { ensureTable as ensureUsersTables } from '../src/modules/users/users.model.js';
import { CategoryModel } from '../src/modules/categories/categories.model.js';
import { BrandModel } from '../src/modules/brands/brands.model.js';
import { ProductModel } from '../src/modules/products/products.model.js';
import { CartModel } from '../src/modules/cart/cart.model.js';
import { WishlistModel } from '../src/modules/wishlist/wishlist.model.js';
import { CouponModel } from '../src/modules/coupons/coupons.model.js';
import { OrderModel } from '../src/modules/orders/orders.model.js';
import { PaymentModel } from '../src/modules/payments/payments.model.js';
import { ReviewModel } from '../src/modules/reviews/reviews.model.js';
import { BannerModel } from '../src/modules/banners/banners.model.js';
import { ShippingModel } from '../src/modules/shipping/shipping.model.js';
import { NotificationModel } from '../src/modules/notifications/notifications.model.js';
import { ensureTable as ensureReportsTables } from '../src/modules/reports/reports.model.js';
import { CmsModel } from '../src/modules/cms/cms.model.js';
import { SettingsModel } from '../src/modules/settings/settings.model.js';
import { RoleModel } from '../src/modules/roles/roles.model.js';

export const ensureAllTables = async () => {
  await UserModel.ensureTable();
  await OtpModel.ensureTable();
  await AdminUserModel.ensureTable();
  await RoleModel.ensureTable();
  await RoleModel.seedDefaults();
  await RoleModel.migrateAdminUsers();
  await ensureUsersTables();
  await CategoryModel.ensureTable();
  await BrandModel.ensureTable();
  await ProductModel.ensureTable();
  await CartModel.ensureTable();
  await WishlistModel.ensureTable();
  await CouponModel.ensureTable();
  await OrderModel.ensureTable();
  await PaymentModel.ensureTable();
  await ReviewModel.ensureTable();
  await BannerModel.ensureTable();
  await ShippingModel.ensureTable();
  await NotificationModel.ensureTable();
  await ensureReportsTables();
  await CmsModel.ensureTable();
  await SettingsModel.ensureTable();
};
