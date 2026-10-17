// Coupons business logic. Throws Error with err.statusCode on failure.
import { validateAndCalculate } from '../../utils/coupon.js';
import { CouponModel } from './coupons.model.js';

const failWith = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

export const validateCoupon = async ({ code, subtotal, userId }) => {
  const { discount, coupon } = await validateAndCalculate({
    code,
    subtotal,
    userId,
  });
  return {
    valid: true,
    coupon: { code: coupon.code, type: coupon.type, value: Number(coupon.value) },
    discount,
  };
};

export const listCoupons = async ({ limit, offset }) => {
  const [rows, total] = await Promise.all([
    CouponModel.list({ limit, offset }),
    CouponModel.count(),
  ]);
  return { rows, total };
};

const normalizeJsonIds = (v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return Array.isArray(v) ? JSON.stringify(v.map(Number)) : null;
};

export const createCoupon = async (data) => {
  const code = String(data.code || '').trim().toUpperCase();
  if (!code) throw failWith(400, 'Coupon code is required');
  const existing = await CouponModel.findByCode(code);
  if (existing) throw failWith(409, 'Coupon code already exists');

  const id = await CouponModel.create({
    code,
    type: data.type,
    value: data.value,
    min_order_amount: data.min_order_amount ?? 0,
    max_discount: data.max_discount ?? null,
    usage_limit: data.usage_limit ?? null,
    first_order_only: data.first_order_only ? 1 : 0,
    applicable_products: normalizeJsonIds(data.applicable_products) ?? null,
    applicable_categories: normalizeJsonIds(data.applicable_categories) ?? null,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    status: data.status || 'active',
  });
  return { coupon: await CouponModel.findById(id) };
};

export const getCouponDetail = async (id) => {
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw failWith(404, 'Coupon not found');
  const usage = await CouponModel.usageForCoupon(id);
  return { coupon, usage };
};

export const updateCoupon = async (id, data) => {
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw failWith(404, 'Coupon not found');

  const patch = {};
  if (data.code !== undefined) {
    const code = String(data.code || '').trim().toUpperCase();
    if (!code) throw failWith(400, 'Coupon code is required');
    const existing = await CouponModel.findByCode(code);
    if (existing && existing.id !== Number(id)) {
      throw failWith(409, 'Coupon code already exists');
    }
    patch.code = code;
  }
  if (data.type !== undefined) patch.type = data.type;
  if (data.value !== undefined) patch.value = data.value;
  if (data.min_order_amount !== undefined) patch.min_order_amount = data.min_order_amount;
  if (data.max_discount !== undefined) patch.max_discount = data.max_discount ?? null;
  if (data.usage_limit !== undefined) patch.usage_limit = data.usage_limit ?? null;
  if (data.first_order_only !== undefined) {
    patch.first_order_only = data.first_order_only ? 1 : 0;
  }
  const prodIds = normalizeJsonIds(data.applicable_products);
  if (prodIds !== undefined) patch.applicable_products = prodIds;
  const catIds = normalizeJsonIds(data.applicable_categories);
  if (catIds !== undefined) patch.applicable_categories = catIds;
  if (data.starts_at !== undefined) patch.starts_at = data.starts_at || null;
  if (data.ends_at !== undefined) patch.ends_at = data.ends_at || null;
  if (data.status !== undefined) patch.status = data.status;

  if (Object.keys(patch).length) {
    await CouponModel.update(id, patch);
  }
  return { coupon: await CouponModel.findById(id) };
};

export const deleteCoupon = async (id) => {
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw failWith(404, 'Coupon not found');
  await CouponModel.remove(id);
  return { message: 'Coupon deleted' };
};

export const setCouponStatus = async (id, status) => {
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw failWith(404, 'Coupon not found');
  await CouponModel.setStatus(id, status);
  return { message: `Coupon ${status === 'active' ? 'activated' : 'deactivated'}` };
};
