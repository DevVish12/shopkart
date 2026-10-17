// Coupons routes — mounted at /api/coupons (customer) and /api/admin/coupons (admin).
import { Router } from 'express';
import { body, param, query as qv } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as ctrl from './coupons.controller.js';

const idParam = [param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid id')];

export const couponsRouter = Router();

// Public: currently-valid coupon codes (safe fields only) for the offers box.
couponsRouter.get('/active', ctrl.listActivePublic);

couponsRouter.post(
  '/validate',
  customerAuth,
  [
    body('code').isString().trim().notEmpty().withMessage('code is required'),
    body('subtotal').isFloat({ min: 0 }).withMessage('subtotal must be 0 or more'),
  ],
  validate,
  ctrl.validateCoupon
);

const couponFields = (optional) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('code').isString().trim().notEmpty().withMessage('code is required')),
    opt(body('type').isIn(['percentage', 'flat']).withMessage('type must be percentage or flat')),
    opt(body('value').isFloat({ gt: 0 }).withMessage('value must be greater than 0')),
    opt(body('min_order_amount').isFloat({ min: 0 }).withMessage('min_order_amount must be 0 or more')),
    opt(body('max_discount').isFloat({ min: 0 }).withMessage('max_discount must be 0 or more')),
    opt(body('usage_limit').isInt({ min: 1, max: 100 }).withMessage('usage_limit must be a positive integer')),
    opt(body('first_order_only').isBoolean().withMessage('first_order_only must be a boolean')),
    opt(body('applicable_products').isArray().withMessage('applicable_products must be an array')),
    opt(body('applicable_categories').isArray().withMessage('applicable_categories must be an array')),
    opt(body('starts_at').isISO8601().withMessage('starts_at must be a valid date')),
    opt(body('ends_at').isISO8601().withMessage('ends_at must be a valid date')),
    opt(body('status').isIn(['active', 'inactive']).withMessage('Invalid status')),
  ];
};

export const couponsAdminRouter = Router();
couponsAdminRouter.use(adminAuth);

couponsAdminRouter.get(
  '/',
  requirePermission('coupons.view'),
  [
    qv('page').optional().isInt({ min: 1, max: 100 }).withMessage('page must be a positive integer'),
    qv('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be a positive integer'),
  ],
  validate,
  ctrl.adminList
);

couponsAdminRouter.post('/',
  requirePermission('coupons.create'), couponFields(false), validate, ctrl.adminCreate);

couponsAdminRouter.get('/:id',
  requirePermission('coupons.view'), idParam, validate, ctrl.adminDetail);

couponsAdminRouter.put('/:id',
  requirePermission('coupons.edit'), [...idParam, ...couponFields(true)], validate, ctrl.adminUpdate);

couponsAdminRouter.delete('/:id',
  requirePermission('coupons.delete'), idParam, validate, ctrl.adminDelete);

couponsAdminRouter.put(
  '/:id/status',
  requirePermission('coupons.edit'),
  [...idParam, body('status').isIn(['active', 'inactive']).withMessage('Invalid status')],
  validate,
  ctrl.adminSetStatus
);
