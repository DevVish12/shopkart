// Orders business logic. Throws Error with err.statusCode on failure.
import { pool, query } from '../../config/db.js';
import env from '../../config/env.js';
import { getRazorpayConfig } from '../../config/razorpay.js';
import { CartModel } from '../cart/cart.model.js';
import { effectivePrice } from '../../utils/productFormat.js';
import { calculateTotals } from '../../utils/orderTotals.js';
import { generateOrderId } from '../../utils/generateOrderId.js';
import { notify, notifyOrderStatus } from '../../utils/notify.js';
import { emitOrderCreated, emitOrderStatus } from '../../realtime.js';
import { OrderModel } from './orders.model.js';
import { PaymentModel } from '../payments/payments.model.js';
import { CouponModel } from '../coupons/coupons.model.js';

const failWith = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const PAYMENT_METHODS = ['cod', 'razorpay', 'upi', 'card', 'netbanking', 'wallet'];

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

// Admin status transition map (contract + brief).
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'refunded'],
  confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['out_for_delivery', 'refunded'],
  out_for_delivery: ['delivered', 'refunded'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

const TIMELINE_STEPS = [
  { status: 'pending', label: 'Order placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
];

const TERMINAL_LABELS = {
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

const variantLabelFor = (variant) => {
  if (!variant) return null;
  if (variant.weight_label) return variant.weight_label;
  const parts = [];
  if (variant.size) parts.push(`Size: ${variant.size}`);
  if (variant.color) parts.push(`Color: ${variant.color}`);
  return parts.length ? parts.join(', ') : null;
};

const buildTimeline = (order, history) => {
  const firstAt = {};
  for (const h of history) {
    if (!(h.status in firstAt)) firstAt[h.status] = h.created_at;
  }
  const timeline = TIMELINE_STEPS.map(({ status, label }) => ({
    status,
    label,
    at: firstAt[status] || null,
    done: !!firstAt[status],
  }));
  if (TERMINAL_LABELS[order.order_status]) {
    timeline.push({
      status: order.order_status,
      label: TERMINAL_LABELS[order.order_status],
      at: firstAt[order.order_status] || null,
      done: true,
    });
  }
  return timeline;
};

// Creates a Razorpay order up-front so the id can be stored in the same transaction.
const createRazorpayOrderUpfront = async (grandTotal, orderNumber) => {
  const Razorpay = (await import('razorpay')).default;
  const rz = await getRazorpayConfig();
  const rzp = new Razorpay({
    key_id: rz.keyId,
    key_secret: rz.keySecret,
  });
  const rzOrder = await rzp.orders.create({
    amount: Math.round(Number(grandTotal) * 100),
    currency: 'INR',
    receipt: orderNumber,
  });
  return rzOrder.id;
};

export const checkoutOrder = async ({
  userId,
  addressId,
  couponCode,
  paymentMethod,
  customerNotes,
}) => {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw failWith(400, 'Invalid payment method');
  }

  // (a) server-side cart
  const { items } = (await CartModel.getCartWithItems(userId)) || { items: [] };
  if (!items || !items.length) {
    throw failWith(400, 'Your cart is empty');
  }

  // (b) address must belong to the customer
  const addrRows = await query(
    `SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1`,
    [addressId, userId]
  );
  if (!addrRows.length) throw failWith(404, 'Address not found');
  const address = addrRows[0];

  // (c) validate products, stock and compute unit prices
  const lines = [];
  for (const item of items) {
    const product = item.product;
    if (!product || product.status !== 'active') {
      throw failWith(400, `Product is no longer available`);
    }
    const variant = item.variant || null;
    const stock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    if (Number(item.qty) > stock) {
      throw failWith(400, `Insufficient stock for ${product.name}`);
    }
    const unit = round2(effectivePrice(product, variant));
    lines.push({
      productId: product.id,
      productName: product.name,
      variantId: variant ? variant.id : null,
      variantLabel: variantLabelFor(variant),
      sku: (variant && variant.sku) || product.sku || null,
      qty: Number(item.qty),
      price: unit,
      mrp: round2((variant && variant.mrp) || product.mrp || unit),
      imageUrl: product.primary_image || null,
      categoryId: product.category_id,
    });
  }

  // (d) server-side totals (coupon validated inside)
  const totalsItems = lines.map((l) => ({
    productId: l.productId,
    categoryId: l.categoryId,
    price: l.price,
    qty: l.qty,
  }));
  const totals = await calculateTotals({
    items: totalsItems,
    pincode: address.pincode,
    couponCode: couponCode || null,
    userId,
  });

  // (e) order number
  const orderNumber = await generateOrderId();

  // (i-pre) Razorpay order before the transaction so failures leave no partial state.
  // If the gateway call fails, checkout still succeeds — the customer pays
  // from the orders page. A failed payment must never lose the order.
  let razorpayOrderId = null;
  let razorpayError = null;
  const rzConf = await getRazorpayConfig();
  const razorpayConfigured = rzConf.enabled;
  if (paymentMethod !== 'cod' && razorpayConfigured) {
    try {
      razorpayOrderId = await createRazorpayOrderUpfront(totals.grandTotal, orderNumber);
    } catch (e) {
      razorpayError = e?.message || 'Razorpay is temporarily unavailable';
    }
  }

  const conn = await pool.getConnection();
  let orderId;
  try {
    await conn.beginTransaction();

    // (e) orders row
    orderId = await OrderModel.create(
      {
        userId,
        addressId: address.id,
        orderNumber,
        addressSnapshot: address,
        itemsSubtotal: totals.subtotal,
        discountAmount: totals.discount,
        couponId: totals.coupon ? totals.coupon.id : null,
        couponCode: totals.coupon ? totals.coupon.code : null,
        shippingCharge: totals.shippingCharge,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        paymentMethod,
        customerNotes: customerNotes || null,
      },
      conn
    );

    // (f) order items
    await OrderModel.addItems(
      orderId,
      lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        variantLabel: l.variantLabel,
        sku: l.sku,
        qty: l.qty,
        price: l.price,
        mrp: l.mrp,
        imageUrl: l.imageUrl,
      })),
      conn
    );

    // (g) decrement stock with guard
    for (const line of lines) {
      const affected = await OrderModel.decrementProductStock(line.productId, line.qty, conn);
      if (!affected) throw failWith(400, `Insufficient stock for ${line.productName}`);
      if (line.variantId) {
        const vAffected = await OrderModel.decrementVariantStock(line.variantId, line.qty, conn);
        if (!vAffected) throw failWith(400, `Insufficient stock for ${line.productName}`);
      }
    }

    // (h) coupon usage
    if (totals.coupon) {
      await CouponModel.recordUsage(
        {
          couponId: totals.coupon.id,
          userId,
          orderId,
          discountAmount: totals.discount,
        },
        conn
      );
      await CouponModel.incrementUsedCount(totals.coupon.id, conn);
    }

    // (i) payments row (provider enum only supports cod/razorpay; non-cod online methods go through Razorpay)
    await PaymentModel.create(
      {
        orderId,
        provider: paymentMethod === 'cod' ? 'cod' : 'razorpay',
        amount: totals.grandTotal,
        status: 'pending',
        razorpayOrderId,
      },
      conn
    );

    // (k) initial history
    await OrderModel.addHistory(orderId, 'pending', null, conn);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // (j) clear cart
  await CartModel.clearCart(userId);

  // (l) notification
  await notify({
    userId,
    type: 'order_confirmation',
    title: 'Order placed',
    message: `Your order ${orderNumber} has been placed successfully.`,
  });

  // (m) realtime — new order appears instantly on admin screens
  try {
    emitOrderCreated({
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      grand_total: totals.grandTotal,
      payment_method: paymentMethod,
      order_status: 'pending',
      created_at: new Date().toISOString(),
    });
  } catch {
    // realtime must never break checkout
  }

  let payment;
  if (paymentMethod === 'cod') {
    payment = { provider: 'cod' };
  } else if (razorpayOrderId) {
    payment = {
      provider: 'razorpay',
      keyId: rzConf.keyId,
      razorpayOrderId,
      amount: Math.round(Number(totals.grandTotal) * 100), // paise — Razorpay checkout needs the exact order amount
    };
  } else if (paymentMethod !== 'cod') {
    payment = {
      provider: paymentMethod,
      message: razorpayError || 'Online payment is not available right now — pay from your orders page or choose Cash on Delivery',
      retryable: true,
    };
  }

  return {
    order: {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      grand_total: totals.grandTotal,
      payment_method: paymentMethod,
      order_status: 'pending',
      created_at: new Date().toISOString(),
    },
    payment,
  };
};

export const listMyOrders = async (userId, { status, limit, offset }) => {
  const [rows, total] = await Promise.all([
    OrderModel.listForUser(userId, { status, limit, offset }),
    OrderModel.countForUser(userId, { status }),
  ]);
  return { rows, total };
};

export const getMyOrder = async (userId, orderId) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  if (order.user_id !== userId) {
    throw failWith(403, 'You do not have permission to view this order');
  }
  const [items, history] = await Promise.all([
    OrderModel.getItems(orderId),
    OrderModel.getHistory(orderId),
  ]);
  return {
    order: {
      ...order,
      items,
      statusHistory: history,
      timeline: buildTimeline(order, history),
    },
    coupon: order.coupon_code ? { code: order.coupon_code } : null,
  };
};

export const cancelMyOrder = async (userId, orderId) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  if (order.user_id !== userId) {
    throw failWith(403, 'You do not have permission to cancel this order');
  }
  if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
    throw failWith(400, 'Order cannot be cancelled at this stage');
  }

  const items = await OrderModel.getItems(orderId);
  for (const item of items) {
    await OrderModel.restockProduct(item.product_id, item.qty);
    if (item.variant_id) await OrderModel.restockVariant(item.variant_id, item.qty);
  }

  await OrderModel.setStatus(orderId, { orderStatus: 'cancelled' });
  await OrderModel.addHistory(orderId, 'cancelled', 'Cancelled by customer');
  await notifyOrderStatus(userId, order.order_number, 'cancelled');
  try { emitOrderStatus(orderId, userId, 'cancelled', order.order_number); } catch {}

  return {
    message: 'Order cancelled',
    order: { id: order.id, order_number: order.order_number, order_status: 'cancelled' },
  };
};

export const returnMyOrder = async (userId, orderId, reason) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  if (order.user_id !== userId) {
    throw failWith(403, 'You do not have permission to return this order');
  }
  if (order.order_status !== 'delivered') {
    throw failWith(400, 'Only delivered orders can be returned');
  }
  const existing = await OrderModel.getActiveReturn(orderId);
  if (existing) {
    throw failWith(409, 'A return request already exists for this order');
  }

  const returnId = await OrderModel.createReturn({ orderId, userId, reason });
  await OrderModel.setStatus(orderId, { orderStatus: 'returned' });
  await OrderModel.addHistory(orderId, 'returned', reason);
  await notifyOrderStatus(userId, order.order_number, 'returned');
  try { emitOrderStatus(orderId, userId, 'returned', order.order_number); } catch {}

  const rows = await query(
    `SELECT id, order_id, status, reason, created_at FROM order_returns WHERE id = ? LIMIT 1`,
    [returnId]
  );
  const ret = rows[0];
  return {
    returnRequest: {
      id: ret.id,
      order_id: ret.order_id,
      status: ret.status,
      reason: ret.reason,
      created_at: ret.created_at,
    },
  };
};

// ---------------- admin ----------------

export const adminListOrders = async ({ status, search, limit, offset }) => {
  const [rows, total] = await Promise.all([
    OrderModel.listForAdmin({ status, search, limit, offset }),
    OrderModel.countForAdmin({ status, search }),
  ]);
  return { rows, total };
};

export const adminGetOrder = async (orderId) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  const [items, history, payment, customerRows] = await Promise.all([
    OrderModel.getItems(orderId),
    OrderModel.getHistory(orderId),
    PaymentModel.findLatestByOrder(orderId),
    query(`SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1`, [order.user_id]),
  ]);
  const c = customerRows[0];
  return {
    order: {
      ...order,
      items,
      statusHistory: history,
      customer: c ? { id: c.id, name: c.name, email: c.email, phone: c.phone } : null,
      payment: payment || null,
    },
  };
};

export const adminUpdateStatus = async (orderId, status, note) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  const allowed = TRANSITIONS[order.order_status] || [];
  if (!allowed.includes(status)) {
    throw failWith(400, 'Invalid status transition');
  }

  let paymentStatus;
  if (status === 'delivered' && order.payment_method === 'cod') paymentStatus = 'paid';
  if (status === 'refunded') paymentStatus = 'refunded';

  await OrderModel.setStatus(orderId, {
    orderStatus: status,
    ...(paymentStatus ? { paymentStatus } : {}),
  });
  await OrderModel.addHistory(orderId, status, note || null);
  if (paymentStatus) {
    await PaymentModel.setLatestStatus(orderId, paymentStatus);
  }
  await notifyOrderStatus(order.user_id, order.order_number, status);
  // realtime — admin list + customer's order page update without reload
  try {
    emitOrderStatus(orderId, order.user_id, status, order.order_number);
  } catch {
    // realtime must never break status updates
  }

  const updated = await OrderModel.findById(orderId);
  return {
    order: {
      id: updated.id,
      order_number: updated.order_number,
      order_status: updated.order_status,
      payment_status: updated.payment_status,
    },
  };
};

export const adminSetTracking = async (orderId, trackingNumber) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw failWith(404, 'Order not found');
  await OrderModel.setStatus(orderId, { trackingNumber });
  return { message: 'Tracking number updated' };
};
