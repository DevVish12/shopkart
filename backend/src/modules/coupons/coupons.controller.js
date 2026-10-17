// Coupons controllers — thin try/catch wrappers around the service.
import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import * as CouponsService from './coupons.service.js';
import { CouponModel } from './coupons.model.js';

export const listActivePublic = async (req, res) => {
  try {
    const data = await CouponModel.listActivePublic(10);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const result = await CouponsService.validateCoupon({
      code: req.body.code,
      subtotal: Number(req.body.subtotal),
      userId: req.user.id,
    });
    return ok(res, result);
  } catch (e) {
    // Contract shape for an invalid coupon: 400 { valid: false, message }
    return res.status(400).json({ success: false, valid: false, message: e.message });
  }
};

// ---------------- admin ----------------
export const adminList = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, total } = await CouponsService.listCoupons({ limit, offset });
    return paginated(res, rows, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminCreate = async (req, res) => {
  try {
    const result = await CouponsService.createCoupon(req.body);
    return created(res, result, 'Coupon created');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminDetail = async (req, res) => {
  try {
    const result = await CouponsService.getCouponDetail(Number(req.params.id));
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminUpdate = async (req, res) => {
  try {
    const result = await CouponsService.updateCoupon(Number(req.params.id), req.body);
    return ok(res, result, 'Coupon updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminDelete = async (req, res) => {
  try {
    const result = await CouponsService.deleteCoupon(Number(req.params.id));
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminSetStatus = async (req, res) => {
  try {
    const result = await CouponsService.setCouponStatus(Number(req.params.id), req.body.status);
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
