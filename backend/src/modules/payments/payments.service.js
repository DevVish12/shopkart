// Payments business logic (Razorpay). Throws Error with err.statusCode on failure.
import crypto from 'crypto';
import { getRazorpayConfig } from '../../config/razorpay.js';
import { notifyOrderStatus } from '../../utils/notify.js';
import { OrderModel } from '../orders/orders.model.js';
import { PaymentModel } from './payments.model.js';

const failWith = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const getOwnOrder = async (orderId, userId) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  if (order.user_id !== userId) {
    throw failWith(403, 'You do not have permission to access this order');
  }
  return order;
};

export const createRazorpayOrder = async (orderId, userId) => {
  const order = await getOwnOrder(orderId, userId);
  const rz = await getRazorpayConfig();
  if (!rz.enabled) {
    throw failWith(400, 'Razorpay not configured — use Cash on Delivery');
  }

  const Razorpay = (await import('razorpay')).default;
  const rzp = new Razorpay({
    key_id: rz.keyId,
    key_secret: rz.keySecret,
  });
  const rzOrder = await rzp.orders.create({
    amount: Math.round(Number(order.grand_total) * 100),
    currency: 'INR',
    receipt: order.order_number,
  });

  const existing = await PaymentModel.findLatestByOrder(orderId);
  if (existing) {
    await PaymentModel.update(existing.id, {
      provider: 'razorpay',
      razorpayOrderId: rzOrder.id,
      status: 'pending',
    });
  } else {
    await PaymentModel.create({
      orderId,
      provider: 'razorpay',
      amount: order.grand_total,
      status: 'pending',
      razorpayOrderId: rzOrder.id,
    });
  }

  return {
    keyId: rz.keyId,
    razorpayOrderId: rzOrder.id,
    amount: rzOrder.amount, // paise — must match the Razorpay order exactly
    currency: rzOrder.currency || 'INR',
  };
};

export const verifyRazorpayPayment = async (
  orderId,
  userId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
) => {
  const order = await getOwnOrder(orderId, userId);
  const rz = await getRazorpayConfig();
  if (!rz.enabled) {
    throw failWith(400, 'Razorpay not configured');
  }

  const expected = crypto
    .createHmac('sha256', rz.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    throw failWith(400, 'Payment verification failed');
  }

  let payment = await PaymentModel.findLatestByOrder(orderId);
  if (!payment) {
    const id = await PaymentModel.create({
      orderId,
      provider: 'razorpay',
      amount: order.grand_total,
      status: 'pending',
    });
    payment = { id };
  }
  await PaymentModel.update(payment.id, {
    status: 'paid',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  const wasPending = order.order_status === 'pending';
  await OrderModel.setStatus(orderId, {
    paymentStatus: 'paid',
    ...(wasPending ? { orderStatus: 'confirmed' } : {}),
  });
  if (wasPending) {
    await OrderModel.addHistory(orderId, 'confirmed', 'Payment verified via Razorpay');
    await notifyOrderStatus(userId, order.order_number, 'confirmed');
  }

  const updated = await OrderModel.findById(orderId);
  return {
    message: 'Payment verified',
    order: {
      id: updated.id,
      order_number: updated.order_number,
      order_status: updated.order_status,
      payment_status: updated.payment_status,
    },
  };
};
