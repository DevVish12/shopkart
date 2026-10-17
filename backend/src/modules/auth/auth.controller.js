import { ok, created, fail } from '../../utils/response.js';
import * as authService from './auth.service.js';

// ---------- customer ----------

export const register = async (req, res) => {
  try {
    const { token, user } = await authService.register(req.body);
    return created(res, { token, user }, 'Registration successful');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const login = async (req, res) => {
  try {
    const { token, user } = await authService.login(req.body);
    return ok(res, { token, user }, 'Login successful');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const sendOtp = async (req, res) => {
  try {
    const result = await authService.sendOtp(req.body);
    return ok(res, result, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp(req.body);
    return ok(res, { verified: result.verified }, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { token, user } = await authService.googleLogin(req.body);
    return ok(res, { token, user }, 'Login successful');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const me = async (req, res) => {
  try {
    const result = await authService.getMe(req.user.id);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile(req.user.id, req.body);
    return ok(res, result, 'Profile updated successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------- admin auth ----------

export const adminLogin = async (req, res) => {
  try {
    const { token, admin } = await authService.adminLogin(req.body);
    return ok(res, { token, admin }, 'Login successful');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminMe = async (req, res) => {
  try {
    const result = await authService.adminGetMe(req.admin.id);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------- admin users (super_admin) ----------

export const listAdminUsers = async (req, res) => {
  try {
    const result = await authService.listAdminUsers();
    return ok(res, result.data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const result = await authService.createAdminUser(req.body);
    return created(res, result.admin, 'Admin user created successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const result = await authService.updateAdminUser(req.params.id, req.body, req.admin.id);
    return ok(res, result.admin, 'Admin user updated successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const result = await authService.deleteAdminUser(req.params.id, req.admin.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
