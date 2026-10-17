import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { authLimiter } from '../../middleware/rateLimit.middleware.js';
import * as authController from './auth.controller.js';

// Mounted at /api/auth
export const customerAuthRouter = Router();

const passwordRule = (field = 'password') =>
  body(field).isLength({ min: 6 }).withMessage(`${field} must be at least 6 characters`);

customerAuthRouter.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').optional().trim().isLength({ min: 6, max: 20 }).withMessage('Invalid phone number'),
    passwordRule(),
  ],
  validate,
  authController.register
);

customerAuthRouter.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

customerAuthRouter.post(
  '/send-otp',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('purpose').isIn(['verify_email', 'reset_password']).withMessage('Invalid purpose'),
  ],
  validate,
  authController.sendOtp
);

customerAuthRouter.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('otp').trim().isLength({ min: 4, max: 10 }).withMessage('OTP is required'),
    body('purpose').isIn(['verify_email', 'reset_password']).withMessage('Invalid purpose'),
  ],
  validate,
  authController.verifyOtp
);

customerAuthRouter.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  authController.forgotPassword
);

customerAuthRouter.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    passwordRule('newPassword'),
  ],
  validate,
  authController.resetPassword
);

customerAuthRouter.post(
  '/google',
  [body('idToken').trim().notEmpty().withMessage('idToken is required')],
  validate,
  authController.googleLogin
);

customerAuthRouter.get('/me', customerAuth, authController.me);

customerAuthRouter.put(
  '/profile',
  customerAuth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().trim().isLength({ min: 6, max: 20 }).withMessage('Invalid phone number'),
  ],
  validate,
  authController.updateProfile
);

customerAuthRouter.put(
  '/change-password',
  customerAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordRule('newPassword'),
  ],
  validate,
  authController.changePassword
);

// Mounted at /api/admin/auth
export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.adminLogin
);

adminAuthRouter.get('/me', adminAuth, authController.adminMe);

// Mounted at /api/admin/users
export const adminUsersRouter = Router();

adminUsersRouter.use(adminAuth);

adminUsersRouter.get('/', requirePermission('admins.view'), authController.listAdminUsers);

adminUsersRouter.post(
  '/',
  requirePermission('admins.create'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    passwordRule(),
    body('role_id').isInt({ min: 1 }).withMessage('role_id is required'),
  ],
  validate,
  authController.createAdminUser
);

adminUsersRouter.put(
  '/:id',
  requirePermission('admins.edit'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name is required'),
    body('role_id').optional().isInt({ min: 1 }).withMessage('Invalid role_id'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  ],
  validate,
  authController.updateAdminUser
);

adminUsersRouter.delete(
  '/:id',
  requirePermission('admins.delete'),
  authController.deleteAdminUser
);
