// Reviews HTTP layer. Also exports listByProduct for GET /products/:slug/reviews.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import * as ReviewService from './reviews.service.js';

const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'uploads', 'reviews');

const cleanupUploadedFiles = (files) => {
  for (const f of files || []) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, f.filename));
    } catch {
      // ignore
    }
  }
};

// GET /products/:slug/reviews — approved only, with summary.
export const listByProduct = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const sort = req.query.sort === 'helpful' ? 'helpful' : 'recent';
    const { data, total, summary } = await ReviewService.listProductReviews(
      req.params.slug, sort, page, limit, offset
    );
    const body = { success: true, data, pagination: buildPagination(page, limit, total), summary };
    return res.status(200).json(body);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const create = async (req, res) => {
  try {
    const { review } = await ReviewService.createReview(req.user.id, req.body, req.files || []);
    return created(res, { review }, 'Review submitted successfully');
  } catch (e) {
    cleanupUploadedFiles(req.files);
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const update = async (req, res) => {
  try {
    const { review } = await ReviewService.updateReview(req.user.id, req.params.id, req.body);
    return ok(res, { review }, 'Review updated successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const remove = async (req, res) => {
  try {
    const result = await ReviewService.deleteReview(req.user.id, req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminList = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { data, total } = await ReviewService.adminListReviews(req.query, page, limit, offset);
    return paginated(res, data, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const approve = async (req, res) => {
  try {
    const result = await ReviewService.approveReview(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const reject = async (req, res) => {
  try {
    const result = await ReviewService.rejectReview(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminRemove = async (req, res) => {
  try {
    const result = await ReviewService.adminDeleteReview(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
