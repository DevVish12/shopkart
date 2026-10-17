import { NotificationModel, NewsletterModel } from './notifications.model.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';

const toNotificationPublic = (n) => ({
  id: n.id,
  userId: n.user_id,
  type: n.type,
  title: n.title,
  message: n.message,
  isRead: Number(n.is_read) === 1,
  createdAt: n.created_at,
});

const notFound = (message) => {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
};

// ---------- customer ----------

export const listUserNotifications = async (userId, queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams, { limit: 20 });
  const [rows, total, unreadCount] = await Promise.all([
    NotificationModel.listForUser(userId, limit, offset),
    NotificationModel.countForUser(userId),
    NotificationModel.unreadCount(userId),
  ]);
  return {
    data: rows.map(toNotificationPublic),
    pagination: buildPagination(page, limit, total),
    unreadCount,
  };
};

export const markRead = async (userId, id) => {
  const affected = await NotificationModel.markRead(id, userId);
  if (!affected) throw notFound('Notification not found');
  return { message: 'Notification marked as read' };
};

export const markAllRead = async (userId) => {
  await NotificationModel.markAllRead(userId);
  return { message: 'All notifications marked as read' };
};

// ---------- admin ----------

export const listAll = async (queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams, { limit: 20 });
  const [rows, total] = await Promise.all([
    NotificationModel.listForAdmin(limit, offset),
    NotificationModel.countAll(),
  ]);
  return {
    data: rows.map(toNotificationPublic),
    pagination: buildPagination(page, limit, total),
  };
};

export const sendNotification = async ({ userId, broadcast, type, title, message }) => {
  const isBroadcast = broadcast === true || broadcast === 'true' || broadcast === 1;
  if (!isBroadcast && !userId) {
    const err = new Error('userId is required unless broadcast is true');
    err.statusCode = 400;
    throw err;
  }
  const notification = await NotificationModel.create({
    userId: isBroadcast ? null : userId,
    type,
    title,
    message,
  });
  return { notification: toNotificationPublic(notification) };
};

// ---------- newsletter ----------

export const subscribe = async ({ email }) => {
  const existing = await NewsletterModel.findByEmail(email);
  if (existing) {
    if (existing.status === 'subscribed') {
      return { statusCode: 200, message: 'Already subscribed' };
    }
    await NewsletterModel.resubscribe(email);
    return { statusCode: 200, message: 'Subscribed successfully' };
  }
  await NewsletterModel.subscribe(email);
  return { statusCode: 201, message: 'Subscribed successfully' };
};
