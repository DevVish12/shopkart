// Payments routes — mounted at /api/payments (customer only).
import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { customerAuth } from '../../middleware/auth.middleware.js';
import * as ctrl from './payments.controller.js';

export const paymentsRouter = Router();
paymentsRouter.use(customerAuth);

paymentsRouter.post(
  '/razorpay/order',
  [body('orderId').isInt({ min: 1 }).withMessage('orderId is required')],
  validate,
  ctrl.createRazorpayOrder
);

paymentsRouter.post(
  '/razorpay/verify',
  [
    body('orderId').isInt({ min: 1 }).withMessage('orderId is required'),
    body('razorpay_order_id').isString().notEmpty().withMessage('razorpay_order_id is required'),
    body('razorpay_payment_id').isString().notEmpty().withMessage('razorpay_payment_id is required'),
    body('razorpay_signature').isString().notEmpty().withMessage('razorpay_signature is required'),
  ],
  validate,
  ctrl.verifyRazorpay
);
