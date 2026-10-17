// Shipping routes — mounted at /api/shipping (public) and /api/admin/shipping/zones (admin).
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as ctrl from './shipping.controller.js';

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid id')];

export const shippingPublicRouter = Router();

shippingPublicRouter.get('/zones', ctrl.listZones);

shippingPublicRouter.post(
  '/check',
  [body('pincode').isString().trim().notEmpty().withMessage('pincode is required')],
  validate,
  ctrl.check
);

const zoneFields = (optional) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('name').isString().trim().notEmpty().withMessage('name is required')),
    opt(body('pincodes').isString().trim().notEmpty().withMessage('pincodes is required')),
    opt(body('charge').isFloat({ min: 0 }).withMessage('charge must be 0 or more')),
    opt(body('free_above').isFloat({ min: 0 }).withMessage('free_above must be 0 or more')),
    opt(body('estimated_days').isString().withMessage('estimated_days must be a string')),
    opt(body('status').isIn(['active', 'inactive']).withMessage('Invalid status')),
  ];
};

export const shippingAdminRouter = Router();
shippingAdminRouter.use(adminAuth);

shippingAdminRouter.get('/',
  requirePermission('shipping.view'), ctrl.adminList);

shippingAdminRouter.post('/',
  requirePermission('shipping.edit'), zoneFields(false), validate, ctrl.adminCreate);

shippingAdminRouter.put('/:id',
  requirePermission('shipping.edit'), [...idParam, ...zoneFields(true)], validate, ctrl.adminUpdate);

shippingAdminRouter.delete('/:id',
  requirePermission('shipping.edit'), idParam, validate, ctrl.adminDelete);

shippingAdminRouter.put(
  '/:id/status',
  requirePermission('shipping.edit'),
  [...idParam, body('status').isIn(['active', 'inactive']).withMessage('Invalid status')],
  validate,
  ctrl.adminSetStatus
);
