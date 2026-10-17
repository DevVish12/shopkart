import { Router } from 'express';
import fs from 'fs';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor, publicPath } from '../../middleware/upload.middleware.js';
import { updateSettings } from './settings.service.js';
import { ok, fail } from '../../utils/response.js';
import { getPublic, adminGetAll, adminUpdate } from './settings.controller.js';

// ---- Public: GET /api/settings/public ----
export const settingsPublicRouter = Router();
settingsPublicRouter.get('/public', getPublic);

// ---- Admin: /api/admin/settings ----
export const settingsAdminRouter = Router();
settingsAdminRouter.use(adminAuth);

settingsAdminRouter.get('/',
  requirePermission('settings.view'), adminGetAll);

settingsAdminRouter.put(
  '/',
  requirePermission('settings.edit'),
  [
    body()
      .custom((value) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0)
      .withMessage('Request body must be a non-empty object of key/value pairs'),
  ],
  validate,
  adminUpdate
);

// ---- Admin: POST /api/admin/settings/media — upload logo / favicon image ----
// Multipart: image=<file>, key=logo|favicon. Stores under backend/uploads/settings/
// and writes the public path into the matching setting.
const settingsMediaUpload = uploadFor('settings').single('image');

settingsAdminRouter.post(
  '/media',
  requirePermission('settings.edit'),
  settingsMediaUpload,
  async (req, res) => {
    try {
      const key = req.body?.key;
      if (!['logo', 'favicon'].includes(key)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return fail(res, 'key must be "logo" or "favicon"', 400);
      }
      if (!req.file) return fail(res, 'No image file received', 400);
      const path = publicPath('settings', req.file.filename);
      await updateSettings({ [key]: path });
      return ok(res, { key, path }, 'Image uploaded');
    } catch (e) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return fail(res, e.message, e.statusCode || 400);
    }
  }
);
