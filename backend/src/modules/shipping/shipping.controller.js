// Shipping controllers — thin try/catch wrappers around the service.
import { ok, created, fail } from '../../utils/response.js';
import * as ShippingService from './shipping.service.js';

export const listZones = async (req, res) => {
  try {
    const result = await ShippingService.listActiveZones();
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const check = async (req, res) => {
  try {
    const result = await ShippingService.checkPincode(req.body.pincode);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------------- admin ----------------

export const adminList = async (req, res) => {
  try {
    const result = await ShippingService.listAllZones();
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminCreate = async (req, res) => {
  try {
    const result = await ShippingService.createZone(req.body);
    return created(res, result, 'Shipping zone created');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminUpdate = async (req, res) => {
  try {
    const result = await ShippingService.updateZone(Number(req.params.id), req.body);
    return ok(res, result, 'Shipping zone updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminDelete = async (req, res) => {
  try {
    const result = await ShippingService.deleteZone(Number(req.params.id));
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminSetStatus = async (req, res) => {
  try {
    const result = await ShippingService.setZoneStatus(Number(req.params.id), req.body.status);
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
