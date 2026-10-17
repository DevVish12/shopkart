import { ok, created, paginated, fail } from '../../utils/response.js';
import * as notificationsService from './notifications.service.js';

// ---------- customer ----------

export const listNotifications = async (req, res) => {
  try {
    const result = await notificationsService.listUserNotifications(req.user.id, req.query);
    const body = { success: true, data: result.data, pagination: result.pagination, unreadCount: result.unreadCount };
    return res.status(200).json(body);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const markRead = async (req, res) => {
  try {
    const result = await notificationsService.markRead(req.user.id, req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const markAllRead = async (req, res) => {
  try {
    const result = await notificationsService.markAllRead(req.user.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------- admin ----------

export const listAll = async (req, res) => {
  try {
    const { data, pagination } = await notificationsService.listAll(req.query);
    return paginated(res, data, pagination);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const sendNotification = async (req, res) => {
  try {
    const result = await notificationsService.sendNotification(req.body);
    return created(res, result.notification, 'Notification sent successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---------- newsletter ----------

export const subscribe = async (req, res) => {
  try {
    const result = await notificationsService.subscribe(req.body);
    if (result.statusCode === 201) return created(res, null, result.message);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
