import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import * as wishlistController from './wishlist.controller.js';

// Mounted at /api/wishlist
export const wishlistRouter = Router();

wishlistRouter.use(customerAuth);

wishlistRouter.get('/', wishlistController.getWishlist);

wishlistRouter.post(
  '/',
  [body('productId').isInt({ min: 1 }).withMessage('productId is required').toInt()],
  validate,
  wishlistController.addToWishlist
);

wishlistRouter.delete('/:productId', wishlistController.removeFromWishlist);
