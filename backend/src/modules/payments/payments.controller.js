// Payments controllers — thin try/catch wrappers around the service.
import { ok, fail } from '../../utils/response.js';
import * as PaymentsService from './payments.service.js';

export const createRazorpayOrder = async (req, res) => {
  try {
    const result = await PaymentsService.createRazorpayOrder(
      Number(req.body.orderId),
      req.user.id
    );
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const verifyRazorpay = async (req, res) => {
  try {
    const result = await PaymentsService.verifyRazorpayPayment(
      Number(req.body.orderId),
      req.user.id,
      {
        razorpay_order_id: req.body.razorpay_order_id,
        razorpay_payment_id: req.body.razorpay_payment_id,
        razorpay_signature: req.body.razorpay_signature,
      }
    );
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
