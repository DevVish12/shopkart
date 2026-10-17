import { ok, fail } from '../../utils/response.js';
import { getPublicSettings, getAllSettings, updateSettings } from './settings.service.js';
import { clearRazorpayConfigCache } from '../../config/razorpay.js';

export const getPublic = async (req, res) => {
  try {
    const data = await getPublicSettings();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminGetAll = async (req, res) => {
  try {
    const data = await getAllSettings();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminUpdate = async (req, res) => {
  try {
    await updateSettings(req.body);
    clearRazorpayConfigCache(); // payment keys take effect immediately
    return ok(res, null, 'Settings updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
