import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as usersController from './users.controller.js';

// Mounted at /api/admin/customers
export const customersAdminRouter = Router();

customersAdminRouter.use(adminAuth);

customersAdminRouter.get(
  '/',
  requirePermission('customers.view'),
  [
    query('search').optional().trim(),
    query('status').optional({ values: 'falsy' }).isIn(['active', 'blocked']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  usersController.listCustomers
);

customersAdminRouter.get('/:id',
  requirePermission('customers.view'), usersController.getCustomer);
customersAdminRouter.put('/:id/block',
  requirePermission('customers.edit'), usersController.blockCustomer);
customersAdminRouter.put('/:id/unblock',
  requirePermission('customers.edit'), usersController.unblockCustomer);

// Mounted at /api/addresses
export const addressesRouter = Router();

addressesRouter.use(customerAuth);

const addressFields = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('line2').optional().trim(),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').trim().matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean').toBoolean(),
];

addressesRouter.get('/', usersController.listAddresses);
addressesRouter.post('/', addressFields, validate, usersController.createAddress);
addressesRouter.put('/:id', addressFields, validate, usersController.updateAddress);
addressesRouter.delete('/:id', usersController.deleteAddress);
addressesRouter.put('/:id/default', usersController.setDefaultAddress);
