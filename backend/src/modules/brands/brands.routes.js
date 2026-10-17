// Brands routes. Public mounted at /api/brands, admin at /api/admin/brands.
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor } from '../../middleware/upload.middleware.js';
import * as c from './brands.controller.js';

const brandUpload = uploadFor('brands');

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid brand id'), validate];

const brandFields = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('slug').optional().trim().isLength({ max: 255 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
];

export const brandsPublicRouter = Router();
brandsPublicRouter.get('/', c.list);

export const brandsAdminRouter = Router();
brandsAdminRouter.use(adminAuth);

brandsAdminRouter.get('/',
  requirePermission('brands.view'), c.adminList);

brandsAdminRouter.post(
  '/',
  requirePermission('brands.create'),
  brandUpload.single('logo'),
  [body('name').trim().notEmpty().withMessage('Brand name is required'), ...brandFields],
  validate,
  c.create
);

brandsAdminRouter.put(
  '/:id',
  requirePermission('brands.edit'),
  brandUpload.single('logo'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid brand id'), ...brandFields, validate],
  c.update
);

brandsAdminRouter.delete('/:id',
  requirePermission('brands.delete'), idParam, c.remove);

brandsAdminRouter.put(
  '/:id/status',
  requirePermission('brands.edit'),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid brand id'),
    body('status').notEmpty().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validate,
  ],
  c.setStatus
);
