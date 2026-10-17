import { query } from '../config/db.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const parseIdList = (json) => {
  try {
    const v = typeof json === 'string' ? JSON.parse(json) : json;
    return Array.isArray(v) ? v.map(Number) : null;
  } catch {
    return null;
  }
};

// Validates a coupon code against all contract rules and returns the discount.
// Throws Error(message) when invalid. items = [{ productId, categoryId, price, qty }]
export const validateAndCalculate = async ({ code, subtotal, userId, items = [] }) => {
  if (!code) throw new Error('Coupon code is required');
  const rows = await query('SELECT * FROM coupons WHERE code = ? LIMIT 1', [
    String(code).trim().toUpperCase(),
  ]);
  if (!rows.length) throw new Error('Invalid coupon code');
  const coupon = rows[0];

  if (coupon.status !== 'active') throw new Error('Coupon is not active');
  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) throw new Error('Coupon is not valid yet');
  if (coupon.ends_at && new Date(coupon.ends_at) < now) throw new Error('Coupon has expired');
  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    throw new Error('Coupon usage limit reached');
  }

  const sub = Number(subtotal) || 0;
  if (sub < Number(coupon.min_order_amount || 0)) {
    throw new Error(`Minimum order amount is ₹${coupon.min_order_amount}`);
  }

  if (Number(coupon.first_order_only) === 1 && userId) {
    const prev = await query('SELECT id FROM orders WHERE user_id = ? LIMIT 1', [userId]);
    if (prev.length) throw new Error('This coupon is valid for first order only');
  }

  let eligibleSubtotal = sub;
  const prodIds = parseIdList(coupon.applicable_products);
  const catIds = parseIdList(coupon.applicable_categories);
  if ((prodIds && prodIds.length) || (catIds && catIds.length)) {
    if (!items.length) throw new Error('Coupon is not applicable to your cart');
    eligibleSubtotal = items.reduce((sum, it) => {
      const okP = prodIds && prodIds.length ? prodIds.includes(Number(it.productId)) : true;
      const okC = catIds && catIds.length ? catIds.includes(Number(it.categoryId)) : true;
      return sum + (okP && okC ? Number(it.price) * Number(it.qty) : 0);
    }, 0);
    if (eligibleSubtotal <= 0) throw new Error('Coupon is not applicable to your cart');
  }

  let discount;
  if (coupon.type === 'percentage') {
    discount = eligibleSubtotal * (Number(coupon.value) / 100);
    if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  } else {
    discount = Math.min(Number(coupon.value), eligibleSubtotal);
  }
  discount = round2(Math.min(discount, sub));
  if (discount <= 0) throw new Error('Coupon gives no discount on this order');

  return {
    discount,
    coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: Number(coupon.value) },
  };
};
