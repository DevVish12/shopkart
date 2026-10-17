// Reviews routes. Customer router mounted at /api/reviews, admin at /api/admin/reviews.
import { Router } from 'express';
import { body, param, query as qv } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor } from '../../middleware/upload.middleware.js';
import * as c from './reviews.controller.js';

const reviewUpload = uploadFor('reviews');

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid review id'), validate];

export const reviewsRouter = Router();

reviewsRouter.post(
  '/',
  customerAuth,
  reviewUpload.array('images[]', 5),
  [
    body('productId').notEmpty().withMessage('productId is required').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
    body('rating').notEmpty().withMessage('Rating is required').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ max: 255 }),
    body('comment').optional().trim().isLength({ max: 5000 }),
    validate,
  ],
  c.create
);

reviewsRouter.put(
  '/:id',
  customerAuth,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid review id'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ max: 255 }),
    body('comment').optional().trim().isLength({ max: 5000 }),
    validate,
  ],
  c.update
);

reviewsRouter.delete('/:id', customerAuth, idParam, c.remove);

export const reviewsAdminRouter = Router();
reviewsAdminRouter.use(adminAuth);

reviewsAdminRouter.get(
  '/',
  requirePermission('reviews.view'),
  [qv('status').optional({ values: 'falsy' }).isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'), validate],
  c.adminList
);
reviewsAdminRouter.put('/:id/approve',
  requirePermission('reviews.moderate'), idParam, c.approve);
reviewsAdminRouter.put('/:id/reject',
  requirePermission('reviews.moderate'), idParam, c.reject);
reviewsAdminRouter.delete('/:id',
  requirePermission('reviews.moderate'), idParam, c.adminRemove);
