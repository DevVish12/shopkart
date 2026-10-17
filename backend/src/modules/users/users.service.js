import { CustomerModel } from './users.model.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';

const toCustomerPublic = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  emailVerified: Number(u.email_verified) === 1,
  status: u.status,
  createdAt: u.created_at,
});

const toAddressPublic = (a) => ({
  id: a.id,
  userId: a.user_id,
  fullName: a.full_name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  country: a.country,
  isDefault: Number(a.is_default) === 1,
  createdAt: a.created_at,
});

const notFound = (message) => {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
};

// ---------- admin: customers ----------

export const listCustomers = async (queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams);
  const { rows, total } = await CustomerModel.listAdmin({
    search: queryParams.search || '',
    status: queryParams.status || '',
    limit,
    offset,
  });
  const data = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    created_at: u.created_at,
    ordersCount: Number(u.orders_count),
    totalSpent: Number(Number(u.total_spent).toFixed(2)),
  }));
  return { data, pagination: buildPagination(page, limit, total) };
};

export const getCustomer = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw notFound('Customer not found');
  const addresses = (await CustomerModel.listAddresses(id)).map(toAddressPublic);
  const orders = await CustomerModel.getOrders(id, 20);
  const stats = await CustomerModel.getStats(id);
  stats.totalSpent = Number(Number(stats.totalSpent).toFixed(2));
  return { customer: toCustomerPublic(customer), addresses, orders, stats };
};

export const blockCustomer = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw notFound('Customer not found');
  await CustomerModel.setStatus(id, 'blocked');
  return { message: 'Customer blocked successfully' };
};

export const unblockCustomer = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw notFound('Customer not found');
  await CustomerModel.setStatus(id, 'active');
  return { message: 'Customer unblocked successfully' };
};

// ---------- customer: addresses ----------

export const listAddresses = async (userId) => {
  const rows = await CustomerModel.listAddresses(userId);
  return { data: rows.map(toAddressPublic) };
};

export const createAddress = async (userId, data) => {
  const isFirst = (await CustomerModel.countAddresses(userId)) === 0;
  const isDefault = isFirst ? true : !!data.isDefault;
  if (isDefault) await CustomerModel.unsetDefaults(userId);
  const address = await CustomerModel.createAddress(userId, { ...data, isDefault });
  return { address: toAddressPublic(address) };
};

export const updateAddress = async (userId, id, data) => {
  const address = await CustomerModel.findAddress(id);
  if (!address || Number(address.user_id) !== Number(userId)) throw notFound('Address not found');
  if (data.isDefault) {
    await CustomerModel.unsetDefaults(userId);
    await CustomerModel.setDefault(id);
  }
  const updated = await CustomerModel.updateAddress(id, data);
  const isDefaultNow = data.isDefault ? true : Number(updated.is_default) === 1;
  return { address: toAddressPublic({ ...updated, is_default: isDefaultNow ? 1 : 0 }) };
};

export const deleteAddress = async (userId, id) => {
  const address = await CustomerModel.findAddress(id);
  if (!address || Number(address.user_id) !== Number(userId)) throw notFound('Address not found');
  await CustomerModel.deleteAddress(id);
  return { message: 'Address deleted successfully' };
};

export const setDefaultAddress = async (userId, id) => {
  const address = await CustomerModel.findAddress(id);
  if (!address || Number(address.user_id) !== Number(userId)) throw notFound('Address not found');
  await CustomerModel.unsetDefaults(userId);
  await CustomerModel.setDefault(id);
  return { message: 'Default address updated' };
};
