import { randomBytes } from 'crypto';
import env from '../../config/env.js';
import { UserModel, OtpModel, AdminUserModel } from './auth.model.js';
import { signCustomerToken, signAdminToken } from '../../utils/jwt.js';
import { hashPassword, comparePassword } from '../../utils/bcrypt.js';
import { generateOtp, hashOtp, compareOtp } from '../../utils/otp.js';
import { sendMail } from '../../utils/mailer.js';
import { RoleModel } from '../roles/roles.model.js';
import { ALL_PERMISSION_KEYS, parsePermissions } from '../roles/permissions.js';
import { emitUserRegistered } from '../../realtime.js';

const OTP_TTL_MINUTES = 10;
const OTP_PURPOSES = ['verify_email', 'reset_password'];

const toPublicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  emailVerified: Number(u.email_verified) === 1,
  status: u.status,
  createdAt: u.created_at,
});

const toAdminPublic = (a) => {
  if (!a) return null;
  const isSuperAdmin =
    a.role === 'super_admin' || a.role_slug === 'super-admin';
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role_slug || a.role,
    role_id: a.role_id || null,
    role_name: a.role_name || a.role,
    permissions: isSuperAdmin ? [...ALL_PERMISSION_KEYS] : parsePermissions(a.role_permissions),
    is_super_admin: isSuperAdmin,
    status: a.status,
  };
};

const conflict = (message) => {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
};

// ---------- customer ----------

export const register = async ({ name, email, phone, password }) => {
  const existing = await UserModel.findByEmail(email);
  if (existing) throw conflict('Email already registered');
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ name, email, phone, passwordHash });
  const token = signCustomerToken(user.id);
  const publicUser = toPublicUser(user);
  // Emit in admin list shape (snake_case created_at) so the live row renders.
  try { emitUserRegistered({ ...publicUser, created_at: user.created_at }); } catch {}
  return { token, user: publicUser };
};

export const login = async ({ email, password }) => {
  const user = await UserModel.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  if (user.status === 'blocked') {
    const err = new Error('Your account has been blocked. Please contact support.');
    err.statusCode = 403;
    throw err;
  }
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  const token = signCustomerToken(user.id);
  return { token, user: toPublicUser(user) };
};

export const sendOtp = async ({ email, purpose }) => {
  if (!OTP_PURPOSES.includes(purpose)) {
    const err = new Error('Invalid OTP purpose');
    err.statusCode = 400;
    throw err;
  }
  await OtpModel.invalidateOld(email, purpose);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await OtpModel.create({ email, otpHash, purpose, expiresAt });
  const subject =
    purpose === 'verify_email' ? 'Verify your email address' : 'Reset your password';
  const text = `Your OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`;
  await sendMail({ to: email, subject, text });
  const result = { message: `OTP sent to ${email}` };
  if (env.NODE_ENV === 'development') result.debugOtp = otp;
  return result;
};

export const verifyOtp = async ({ email, otp, purpose }) => {
  if (!OTP_PURPOSES.includes(purpose)) {
    const err = new Error('Invalid OTP purpose');
    err.statusCode = 400;
    throw err;
  }
  const record = await OtpModel.findLatestValid(email, purpose);
  if (!record || !(await compareOtp(String(otp), record.otp_hash))) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }
  await OtpModel.markUsed(record.id);
  if (purpose === 'verify_email') {
    const user = await UserModel.findByEmail(email);
    if (user) await UserModel.setEmailVerified(user.id);
  }
  return { message: 'OTP verified successfully', verified: true };
};

export const forgotPassword = async ({ email }) => {
  const user = await UserModel.findByEmail(email);
  if (user) {
    await sendOtp({ email, purpose: 'reset_password' });
  }
  return { message: 'If an account exists for this email, a reset OTP has been sent' };
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const record = await OtpModel.findLatestValid(email, 'reset_password');
  if (!record || !(await compareOtp(String(otp), record.otp_hash))) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }
  const user = await UserModel.findByEmail(email);
  if (!user) throw notFound('User not found');
  await OtpModel.markUsed(record.id);
  await UserModel.setPassword(user.id, await hashPassword(newPassword));
  return { message: 'Password reset successfully' };
};

export const googleLogin = async ({ idToken }) => {
  if (!env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google login not configured');
    err.statusCode = 501;
    throw err;
  }
  let payload;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) {
      const err = new Error('Invalid Google token');
      err.statusCode = 401;
      throw err;
    }
    payload = await res.json();
  } catch (err) {
    if (err.statusCode) throw err;
    const netErr = new Error('Failed to verify Google token');
    netErr.statusCode = 401;
    throw netErr;
  }
  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    const err = new Error('Invalid Google token');
    err.statusCode = 401;
    throw err;
  }
  if (!payload.email) {
    const err = new Error('Google account has no email address');
    err.statusCode = 400;
    throw err;
  }
  let user = await UserModel.findByEmail(payload.email);
  if (!user) {
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    user = await UserModel.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      phone: null,
      passwordHash,
    });
  }
  await UserModel.setEmailVerified(user.id);
  user = await UserModel.findById(user.id);
  const token = signCustomerToken(user.id);
  return { token, user: toPublicUser(user) };
};

export const getMe = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) throw notFound('User not found');
  return { user: toPublicUser(user) };
};

export const updateProfile = async (id, { name, phone }) => {
  const user = await UserModel.findById(id);
  if (!user) throw notFound('User not found');
  const updated = await UserModel.updateProfile(id, { name, phone });
  return { user: toPublicUser(updated) };
};

export const changePassword = async (id, { currentPassword, newPassword }) => {
  const user = await UserModel.findById(id);
  if (!user) throw notFound('User not found');
  const valid = await comparePassword(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }
  await UserModel.setPassword(id, await hashPassword(newPassword));
  return { message: 'Password changed successfully' };
};

// ---------- admin auth ----------

export const adminLogin = async ({ email, password }) => {
  const admin = await AdminUserModel.findByEmailWithRole(email);
  if (!admin) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  if (admin.status !== 'active') {
    const err = new Error('Admin account is inactive');
    err.statusCode = 403;
    throw err;
  }
  const valid = await comparePassword(password, admin.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  const token = signAdminToken(admin.id, admin.role_slug || admin.role);
  return { token, admin: toAdminPublic(admin) };
};

export const adminGetMe = async (id) => {
  const admin = await AdminUserModel.findByIdWithRole(id);
  if (!admin) throw notFound('Admin not found');
  return { admin: toAdminPublic(admin) };
};

// ---------- admin users (super_admin) ----------

export const listAdminUsers = async () => {
  const data = await AdminUserModel.list();
  return { data };
};

export const createAdminUser = async ({ name, email, password, role_id }) => {
  const existing = await AdminUserModel.findByEmail(email);
  if (existing) throw conflict('Email already registered');
  const role = role_id ? await RoleModel.findById(role_id) : null;
  if (!role) {
    const err = new Error('Valid role_id is required');
    err.statusCode = 400;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const admin = await AdminUserModel.create({ name, email, passwordHash, roleId: role.id });
  return { admin: toAdminPublic(admin) };
};

export const updateAdminUser = async (id, { name, role_id, status }, requesterId) => {
  const admin = await AdminUserModel.findByIdWithRole(id);
  if (!admin) throw notFound('Admin user not found');
  let nextRoleId = admin.role_id;
  if (role_id !== undefined) {
    const role = await RoleModel.findById(role_id);
    if (!role) {
      const err = new Error('Role not found');
      err.statusCode = 400;
      throw err;
    }
    nextRoleId = role.id;
  }
  const isSelf = Number(id) === Number(requesterId);
  const wasSuper =
    admin.role === 'super_admin' || admin.role_slug === 'super-admin';
  if (isSelf && status === 'inactive') {
    const err = new Error('You cannot deactivate your own account');
    err.statusCode = 400;
    throw err;
  }
  if (wasSuper) {
    const nextRole = nextRoleId ? await RoleModel.findById(nextRoleId) : null;
    const staysSuper =
      nextRole && (nextRole.slug === 'super-admin');
    if (!staysSuper) {
      const count = await AdminUserModel.countSuperAdmins();
      if (count <= 1) {
        const err = new Error('Cannot remove the last super admin');
        err.statusCode = 400;
        throw err;
      }
    }
  }
  const updated = await AdminUserModel.update(id, {
    name: name ?? admin.name,
    roleId: nextRoleId,
    status: status ?? admin.status,
  });
  return { admin: toAdminPublic(updated) };
};

export const deleteAdminUser = async (id, requesterId) => {
  const admin = await AdminUserModel.findByIdWithRole(id);
  if (!admin) throw notFound('Admin user not found');
  if (Number(id) === Number(requesterId)) {
    const err = new Error('You cannot delete your own account');
    err.statusCode = 400;
    throw err;
  }
  const isSuper =
    admin.role === 'super_admin' || admin.role_slug === 'super-admin';
  if (isSuper) {
    const count = await AdminUserModel.countSuperAdmins();
    if (count <= 1) {
      const err = new Error('Cannot delete the last super admin');
      err.statusCode = 400;
      throw err;
    }
  }
  await AdminUserModel.remove(id);
  return { message: 'Admin user deleted successfully' };
};
