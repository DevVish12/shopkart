// Categories HTTP layer.
import path from 'path';
import { ok, created, fail } from '../../utils/response.js';
import * as CategoryService from './categories.service.js';
import { deleteFileBestEffort } from './categories.service.js';

export const tree = async (req, res) => {
  try {
    const data = await CategoryService.getCategoryTree();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const getBySlug = async (req, res) => {
  try {
    const result = await CategoryService.getCategoryBySlug(req.params.slug);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminList = async (req, res) => {
  try {
    const data = await CategoryService.adminListCategories();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const create = async (req, res) => {
  try {
    const { category } = await CategoryService.createCategory(req.body, req.file || null);
    return created(res, { category }, 'Category created successfully');
  } catch (e) {
    if (req.file) deleteFileBestEffort(path.posix.join('uploads/categories', req.file.filename));
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const update = async (req, res) => {
  try {
    const { category } = await CategoryService.updateCategory(req.params.id, req.body, req.file || null);
    return ok(res, { category }, 'Category updated successfully');
  } catch (e) {
    if (req.file) deleteFileBestEffort(path.posix.join('uploads/categories', req.file.filename));
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const remove = async (req, res) => {
  try {
    const result = await CategoryService.deleteCategory(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const setStatus = async (req, res) => {
  try {
    const result = await CategoryService.setCategoryStatus(req.params.id, req.body.status);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
