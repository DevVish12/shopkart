import { ok, created, paginated, fail } from '../../utils/response.js';
import * as usersService from './users.service.js';

// ---------- admin: customers ----------

export const listCustomers = async (req, res) => {
  try {
    const { data, pagination } = await usersService.listCustomers(req.query);
    return paginated(res, data, pagination);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const getCustomer = async (req, res) => {
  try {
    const result = await usersService.getCustomer(req.params.id);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const blockCustomer = async (req, res) => {
  try {
    const result = await usersService.blockCustomer(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const unblockCustomer = async (req, res) => {
  try {
    const result = await usersService.unblockCustomer(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------- customer: addresses ----------

export const listAddresses = async (req, res) => {
  try {
    const result = await usersService.listAddresses(req.user.id);
    return ok(res, result.data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const createAddress = async (req, res) => {
  try {
    const result = await usersService.createAddress(req.user.id, req.body);
    return created(res, result.address, 'Address added successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const updateAddress = async (req, res) => {
  try {
    const result = await usersService.updateAddress(req.user.id, req.params.id, req.body);
    return ok(res, result.address, 'Address updated successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const result = await usersService.deleteAddress(req.user.id, req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const result = await usersService.setDefaultAddress(req.user.id, req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
