// Brands business logic. Throws Error with human message; sets err.statusCode (404/409).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../../config/db.js';
import { BrandModel } from './brands.model.js';
import { uniqueSlug } from '../../utils/slug.js';
import { publicPath } from '../../middleware/upload.middleware.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const httpError = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const cleanStr = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

export const deleteFileBestEffort = (publicUrl) => {
  if (!publicUrl) return;
  try {
    fs.unlinkSync(path.join(BACKEND_ROOT, publicUrl));
  } catch {
    // best-effort
  }
};

const formatBrand = (b) => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  logo: b.logo,
  description: b.description,
  status: b.status,
  createdAt: b.created_at,
});

// ---- public ----
export const listActiveBrands = async () => {
  const rows = await BrandModel.findActive();
  return rows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logo: b.logo }));
};

// ---- admin ----
export const adminListBrands = async () => (await BrandModel.findAll()).map(formatBrand);

export const createBrand = async (body, file) => {
  const name = cleanStr(body.name);
  if (!name) throw httpError(400, 'Brand name is required');
  const slug = await uniqueSlug('brands', cleanStr(body.slug) || name);
  const id = await BrandModel.create({
    name,
    slug,
    logo: file ? publicPath('brands', file.filename) : null,
    description: cleanStr(body.description),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  });
  const created = await BrandModel.findById(id);
  return { brand: formatBrand(created) };
};

export const updateBrand = async (id, body, file) => {
  const existing = await BrandModel.findById(id);
  if (!existing) throw httpError(404, 'Brand not found');
  const data = {};
  if (body.name !== undefined) {
    const name = cleanStr(body.name);
    if (!name) throw httpError(400, 'Brand name cannot be empty');
    data.name = name;
    if (!cleanStr(body.slug) && name !== existing.name) {
      data.slug = await uniqueSlug('brands', name, id);
    }
  }
  if (body.slug !== undefined && cleanStr(body.slug)) {
    data.slug = await uniqueSlug('brands', cleanStr(body.slug), id);
  }
  if (body.description !== undefined) data.description = cleanStr(body.description);
  if (body.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) throw httpError(400, 'Invalid status');
    data.status = body.status;
  }
  if (file) {
    data.logo = publicPath('brands', file.filename);
    deleteFileBestEffort(existing.logo);
  }
  if (Object.keys(data).length) await BrandModel.update(id, data);
  const updated = await BrandModel.findById(id);
  return { brand: formatBrand(updated) };
};

export const deleteBrand = async (id) => {
  const existing = await BrandModel.findById(id);
  if (!existing) throw httpError(404, 'Brand not found');
  await query('UPDATE products SET brand_id = NULL WHERE brand_id = ?', [id]);
  await BrandModel.delete(id);
  deleteFileBestEffort(existing.logo);
  return { message: 'Brand deleted successfully' };
};

export const setBrandStatus = async (id, status) => {
  const existing = await BrandModel.findById(id);
  if (!existing) throw httpError(404, 'Brand not found');
  await BrandModel.update(id, { status });
  return { message: `Brand ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
};
