import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import {
  getPublishedPage,
  listPages,
  createPage,
  updatePage,
  deletePage,
} from './cms.service.js';

export const getPageBySlug = async (req, res) => {
  try {
    const page = await getPublishedPage(req.params.slug);
    return ok(res, { page });
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminListPages = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, total } = await listPages(page, limit, offset);
    return paginated(res, rows, buildPagination(page, limit, total));
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminCreatePage = async (req, res) => {
  try {
    const page = await createPage(req.body || {});
    return created(res, { page }, 'Page created');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminUpdatePage = async (req, res) => {
  try {
    const page = await updatePage(req.params.id, req.body || {});
    return ok(res, { page }, 'Page updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminDeletePage = async (req, res) => {
  try {
    await deletePage(req.params.id);
    return ok(res, null, 'Page deleted');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
