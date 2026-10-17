import { query } from '../config/db.js';

export const notify = async ({ userId = null, type, title, message }) => {
  await query('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)', [
    userId,
    type,
    title,
    message,
  ]);
  return true;
};

const STATUS_COPY = {
  pending: ['Order placed', 'Your order {no} has been placed successfully.'],
  confirmed: ['Order confirmed', 'Your order {no} has been confirmed and will be processed soon.'],
  processing: ['Order processing', 'Your order {no} is being packed.'],
  shipped: ['Order shipped', 'Your order {no} has been shipped.'],
  out_for_delivery: ['Out for delivery', 'Your order {no} is out for delivery.'],
  delivered: ['Order delivered', 'Your order {no} has been delivered. Enjoy!'],
  cancelled: ['Order cancelled', 'Your order {no} has been cancelled.'],
  returned: ['Order returned', 'Your return for order {no} has been received.'],
  refunded: ['Refund processed', 'Refund for your order {no} has been processed.'],
};

export const notifyOrderStatus = async (userId, orderNumber, status) => {
  const copy = STATUS_COPY[status];
  if (!copy) return false;
  const [title, template] = copy;
  await notify({
    userId,
    type: `order_${status}`,
    title,
    message: template.replace('{no}', orderNumber),
  });
  return true;
};
