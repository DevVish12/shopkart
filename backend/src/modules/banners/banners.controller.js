import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import {
  listActive,
  listAll,
  createBanner,
  updateBanner,
  deleteBanner,
  setBannerStatus,
} from './banners.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Best-effort removal of a replaced/deleted banner file (stored as 'uploads/banners/<file>').
const removeUpload = (storedPath) => {
  if (!storedPath) return;
  const rel = storedPath.replace(/^uploads\//, '');
  const abs = path.join(UPLOAD_ROOT, rel);
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    /* ignore cleanup failures */
  }
};

export const getBanners = async (req, res) => {
  try {
    const banners = await listActive(req.query.position);
    return ok(res, banners);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminListBanners = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, total } = await listAll(page, limit, offset);
    return paginated(res, rows, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminCreateBanner = async (req, res) => {
  try {
    const image = req.file ? `uploads/banners/${req.file.filename}` : null;
    const banner = await createBanner(req.body || {}, image);
    return created(res, { banner }, 'Banner created');
  } catch (e) {
    // Roll back the uploaded file if the DB write failed validation-wise.
    if (req.file) removeUpload(`uploads/banners/${req.file.filename}`);
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminUpdateBanner = async (req, res) => {
  try {
    const image = req.file ? `uploads/banners/${req.file.filename}` : null;
    const { banner, oldImage } = await updateBanner(req.params.id, req.body || {}, image);
    if (image && oldImage && oldImage !== image) removeUpload(oldImage);
    return ok(res, { banner }, 'Banner updated');
  } catch (e) {
    if (req.file) removeUpload(`uploads/banners/${req.file.filename}`);
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminDeleteBanner = async (req, res) => {
  try {
    const image = await deleteBanner(req.params.id);
    removeUpload(image);
    return ok(res, null, 'Banner deleted');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminSetBannerStatus = async (req, res) => {
  try {
    await setBannerStatus(req.params.id, req.body.status);
    return ok(res, null, 'Banner status updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
