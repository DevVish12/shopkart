import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import {
  getPageBySlug,
  adminListPages,
  adminCreatePage,
  adminUpdatePage,
  adminDeletePage,
} from './cms.controller.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugRule = (optional) => {
  let chain = body('slug').trim();
  if (optional) chain = chain.optional();
  return chain
    .notEmpty()
    .withMessage('slug is required')
    .isLength({ max: 255 })
    .matches(SLUG_RE)
    .withMessage('slug must be URL-safe (lowercase letters, numbers, hyphens)');
};

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid page id')];

// ---- Public: GET /api/cms/:slug (published only) ----
export const cmsPublicRouter = Router();
cmsPublicRouter.get('/:slug', getPageBySlug);

// ---- Admin: /api/admin/cms ----
export const cmsAdminRouter = Router();
cmsAdminRouter.use(adminAuth);

cmsAdminRouter.get('/',
  requirePermission('cms.view'), adminListPages);

cmsAdminRouter.post(
  '/',
  requirePermission('cms.edit'),
  [
    slugRule(false),
    body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 255 }),
    body('content').notEmpty().withMessage('content is required'),
    body('status').optional().isIn(['published', 'draft']).withMessage('status must be published or draft'),
  ],
  validate,
  adminCreatePage
);

cmsAdminRouter.put(
  '/:id',
  requirePermission('cms.edit'),
  [
    ...idParam,
    slugRule(true),
    body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('title must not be empty'),
    body('content').optional().notEmpty().withMessage('content must not be empty'),
    body('status').optional().isIn(['published', 'draft']).withMessage('status must be published or draft'),
  ],
  validate,
  adminUpdatePage
);

cmsAdminRouter.delete('/:id',
  requirePermission('cms.edit'), idParam, validate, adminDeletePage);
