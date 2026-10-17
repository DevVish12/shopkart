import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import * as cartController from './cart.controller.js';

// Mounted at /api/cart
export const cartRouter = Router();

cartRouter.use(customerAuth);

cartRouter.get('/', cartController.getCart);

cartRouter.post(
  '/items',
  [
    body('productId').isInt({ min: 1 }).withMessage('productId is required').toInt(),
    body('variantId').optional().isInt({ min: 1 }).withMessage('variantId must be valid').toInt(),
    body('qty').optional().isInt({ min: 1 }).withMessage('qty must be at least 1').toInt(),
  ],
  validate,
  cartController.addItem
);

cartRouter.put(
  '/items/:itemId',
  [body('qty').isInt({ min: 0 }).withMessage('qty must be a non-negative integer').toInt()],
  validate,
  cartController.updateItem
);

cartRouter.delete('/items/:itemId', cartController.removeItem);

cartRouter.delete('/', cartController.clearCart);
