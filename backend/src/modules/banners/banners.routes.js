import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor } from '../../middleware/upload.middleware.js';
import {
  getBanners,
  adminListBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminSetBannerStatus,
} from './banners.controller.js';

const upload = uploadFor('banners');
const imageUpload = upload.single('image');

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid banner id')];

const dateCheck = (field) =>
  body(field)
    .optional({ values: 'null' })
    .custom((v) => v === '' || !Number.isNaN(new Date(v).getTime()))
    .withMessage(`${field} must be a valid date/time`);

const bannerOptionalFields = [
  body('subtitle').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  body('button_text').optional({ values: 'null' }).trim().isLength({ max: 100 }),
  body('button_link').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  body('coupon_code').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('position').optional({ values: 'null' }).trim().isLength({ min: 1, max: 50 }),
  body('sort_order').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('sort_order must be a non-negative integer'),
  body('status').optional({ values: 'null' }).isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
  dateCheck('starts_at'),
  dateCheck('ends_at'),
];

// ---- Public: GET /api/banners?position=home_hero ----
export const bannersPublicRouter = Router();
bannersPublicRouter.get(
  '/',
  [query('position').optional().trim().isLength({ max: 50 }), validate],
  getBanners
);

// ---- Admin: /api/admin/banners ----
export const bannersAdminRouter = Router();
bannersAdminRouter.use(adminAuth);

bannersAdminRouter.get('/',
  requirePermission('banners.view'), adminListBanners);

bannersAdminRouter.post(
  '/',
  requirePermission('banners.create'),
  imageUpload,
  [
    body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 255 }),
    ...bannerOptionalFields,
  ],
  validate,
  adminCreateBanner
);

bannersAdminRouter.put(
  '/:id',
  requirePermission('banners.edit'),
  imageUpload,
  [
    ...idParam,
    body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('title must not be empty'),
    ...bannerOptionalFields,
  ],
  validate,
  adminUpdateBanner
);

bannersAdminRouter.delete('/:id',
  requirePermission('banners.delete'), idParam, validate, adminDeleteBanner);

bannersAdminRouter.put(
  '/:id/status',
  requirePermission('banners.edit'),
  [...idParam, body('status').isIn(['active', 'inactive']).withMessage('status must be active or inactive')],
  validate,
  adminSetBannerStatus
);
