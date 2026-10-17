// Orders controllers — thin try/catch wrappers around the service.
import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import * as OrdersService from './orders.service.js';

export const checkout = async (req, res) => {
  try {
    const result = await OrdersService.checkoutOrder({
      userId: req.user.id,
      addressId: Number(req.body.addressId),
      couponCode: req.body.couponCode || null,
      paymentMethod: req.body.paymentMethod,
      customerNotes: req.body.customerNotes || null,
    });
    return created(res, result, 'Order placed successfully');
  } catch (e) {
    return fail(res, e.message || 'Could not place order. Please try again.', e.statusCode || 400);
  }
};

export const list = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, total } = await OrdersService.listMyOrders(req.user.id, {
      status: req.query.status || null,
      limit,
      offset,
    });
    return paginated(res, rows, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const detail = async (req, res) => {
  try {
    const result = await OrdersService.getMyOrder(req.user.id, Number(req.params.id));
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const cancel = async (req, res) => {
  try {
    const result = await OrdersService.cancelMyOrder(req.user.id, Number(req.params.id));
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const returnOrder = async (req, res) => {
  try {
    const result = await OrdersService.returnMyOrder(
      req.user.id,
      Number(req.params.id),
      req.body.reason
    );
    return created(res, result, 'Return request submitted');
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

// ---------------- admin ----------------

export const adminList = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, total } = await OrdersService.adminListOrders({
      status: req.query.status || null,
      search: req.query.search || null,
      limit,
      offset,
    });
    return paginated(res, rows, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const adminDetail = async (req, res) => {
  try {
    const result = await OrdersService.adminGetOrder(Number(req.params.id));
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const adminUpdateStatus = async (req, res) => {
  try {
    const result = await OrdersService.adminUpdateStatus(
      Number(req.params.id),
      req.body.status,
      req.body.note || null
    );
    return ok(res, result, 'Order status updated');
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};

export const adminSetTracking = async (req, res) => {
  try {
    const result = await OrdersService.adminSetTracking(
      Number(req.params.id),
      req.body.trackingNumber
    );
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message || 'Request failed. Please try again.', e.statusCode || 400);
  }
};
