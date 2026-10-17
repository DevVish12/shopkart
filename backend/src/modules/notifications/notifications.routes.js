import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as notificationsController from './notifications.controller.js';

// Mounted at /api/notifications
export const notificationsRouter = Router();

notificationsRouter.use(customerAuth);

notificationsRouter.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  notificationsController.listNotifications
);

// NOTE: /read-all is defined BEFORE /:id/read so it is not swallowed by the param route.
notificationsRouter.put('/read-all', notificationsController.markAllRead);
notificationsRouter.put('/:id/read', notificationsController.markRead);

// Mounted at /api/admin/notifications
export const notificationsAdminRouter = Router();

notificationsAdminRouter.use(adminAuth);

notificationsAdminRouter.get(
  '/',
  requirePermission('notifications.view'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  notificationsController.listAll
);

notificationsAdminRouter.post(
  '/',
  requirePermission('notifications.create'),
  [
    body('userId').optional().isInt({ min: 1 }).withMessage('userId must be a valid user id'),
    body('broadcast').optional().isBoolean().withMessage('broadcast must be boolean').toBoolean(),
    body('type').trim().notEmpty().withMessage('Type is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate,
  notificationsController.sendNotification
);

// Mounted at /api/newsletter
export const newsletterRouter = Router();

newsletterRouter.post(
  '/subscribe',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  notificationsController.subscribe
);
