// Orders routes — mounted at /api/orders (customer) and /api/admin/orders (admin).
import { Router } from 'express';
import { body, param, query as qv } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as ctrl from './orders.controller.js';

const PAYMENT_METHODS = ['cod', 'razorpay', 'upi', 'card', 'netbanking', 'wallet'];
const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

const idParam = [param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid id')];

export const ordersRouter = Router();
ordersRouter.use(customerAuth);

ordersRouter.post(
  '/checkout',
  [
    body('addressId').isInt({ min: 1, max: 100 }).withMessage('addressId is required'),
    body('couponCode')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('couponCode must be a non-empty string'),
    body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
    body('customerNotes').optional().isString().withMessage('customerNotes must be a string'),
  ],
  validate,
  ctrl.checkout
);

ordersRouter.get(
  '/',
  [
    qv('status').optional({ values: 'falsy' }).isIn(ORDER_STATUSES).withMessage('Invalid status'),
    qv('page').optional().isInt({ min: 1, max: 100 }).withMessage('page must be a positive integer'),
    qv('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be a positive integer'),
  ],
  validate,
  ctrl.list
);

ordersRouter.get('/:id', idParam, validate, ctrl.detail);

ordersRouter.post('/:id/cancel', idParam, validate, ctrl.cancel);

ordersRouter.post(
  '/:id/return',
  [...idParam, body('reason').isString().trim().notEmpty().withMessage('reason is required')],
  validate,
  ctrl.returnOrder
);

export const ordersAdminRouter = Router();
ordersAdminRouter.use(adminAuth);

ordersAdminRouter.get(
  '/',
  requirePermission('orders.view'),
  [
    qv('status').optional({ values: 'falsy' }).isIn(ORDER_STATUSES).withMessage('Invalid status'),
    qv('search').optional().isString(),
    qv('page').optional().isInt({ min: 1, max: 100 }).withMessage('page must be a positive integer'),
    qv('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be a positive integer'),
  ],
  validate,
  ctrl.adminList
);

ordersAdminRouter.get('/:id',
  requirePermission('orders.view'), idParam, validate, ctrl.adminDetail);

ordersAdminRouter.put(
  '/:id/status',
  requirePermission('orders.edit'),
  [
    ...idParam,
    body('status').isIn(ORDER_STATUSES).withMessage('Invalid status'),
    body('note').optional().isString().withMessage('note must be a string'),
  ],
  validate,
  ctrl.adminUpdateStatus
);

ordersAdminRouter.put(
  '/:id/tracking',
  requirePermission('orders.edit'),
  [
    ...idParam,
    body('trackingNumber')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('trackingNumber is required'),
  ],
  validate,
  ctrl.adminSetTracking
);
