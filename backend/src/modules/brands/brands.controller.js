// Brands HTTP layer.
import path from 'path';
import { ok, created, fail } from '../../utils/response.js';
import * as BrandService from './brands.service.js';
import { deleteFileBestEffort } from './brands.service.js';

export const list = async (req, res) => {
  try {
    const data = await BrandService.listActiveBrands();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const adminList = async (req, res) => {
  try {
    const data = await BrandService.adminListBrands();
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const create = async (req, res) => {
  try {
    const { brand } = await BrandService.createBrand(req.body, req.file || null);
    return created(res, { brand }, 'Brand created successfully');
  } catch (e) {
    if (req.file) deleteFileBestEffort(path.posix.join('uploads/brands', req.file.filename));
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const update = async (req, res) => {
  try {
    const { brand } = await BrandService.updateBrand(req.params.id, req.body, req.file || null);
    return ok(res, { brand }, 'Brand updated successfully');
  } catch (e) {
    if (req.file) deleteFileBestEffort(path.posix.join('uploads/brands', req.file.filename));
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const remove = async (req, res) => {
  try {
    const result = await BrandService.deleteBrand(req.params.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const setStatus = async (req, res) => {
  try {
    const result = await BrandService.setBrandStatus(req.params.id, req.body.status);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
