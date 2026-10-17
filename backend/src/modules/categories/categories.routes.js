// Categories routes. Public mounted at /api/categories, admin at /api/admin/categories.
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor } from '../../middleware/upload.middleware.js';
import * as c from './categories.controller.js';

const categoryUpload = uploadFor('categories');

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid category id'), validate];

const categoryFields = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('slug').optional().trim().isLength({ max: 255 }),
  body('parent_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('parent_id must be a positive integer'),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('sort_order').optional().isInt(),
];

export const categoriesPublicRouter = Router();

categoriesPublicRouter.get('/', c.tree);
categoriesPublicRouter.get(
  '/:slug',
  [param('slug').trim().notEmpty().withMessage('Invalid category slug'), validate],
  c.getBySlug
);

export const categoriesAdminRouter = Router();
categoriesAdminRouter.use(adminAuth);

categoriesAdminRouter.get('/',
  requirePermission('categories.view'), c.adminList);

categoriesAdminRouter.post(
  '/',
  requirePermission('categories.create'),
  categoryUpload.single('image'),
  [body('name').trim().notEmpty().withMessage('Category name is required'), ...categoryFields],
  validate,
  c.create
);

categoriesAdminRouter.put(
  '/:id',
  requirePermission('categories.edit'),
  categoryUpload.single('image'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid category id'), ...categoryFields, validate],
  c.update
);

categoriesAdminRouter.delete('/:id',
  requirePermission('categories.delete'), idParam, c.remove);

categoriesAdminRouter.put(
  '/:id/status',
  requirePermission('categories.edit'),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid category id'),
    body('status').notEmpty().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validate,
  ],
  c.setStatus
);
