// Categories business logic. Throws Error with human message; sets err.statusCode (404/409).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CategoryModel } from './categories.model.js';
import { uniqueSlug } from '../../utils/slug.js';
import { publicPath } from '../../middleware/upload.middleware.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const httpError = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
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

const formatCategory = (c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parentId: c.parent_id,
  image: c.image,
  description: c.description,
  status: c.status,
  sortOrder: c.sort_order,
  createdAt: c.created_at,
});

// ---- public ----
export const getCategoryTree = async () => {
  const rows = await CategoryModel.findActive();
  const byId = new Map();
  rows.forEach((r) => {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      image: r.image,
      description: r.description,
      children: [],
    });
  });
  const roots = [];
  rows.forEach((r) => {
    const node = byId.get(r.id);
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

export const getCategoryBySlug = async (slug) => {
  const cat = await CategoryModel.findBySlug(slug);
  if (!cat || cat.status !== 'active') throw httpError(404, 'Category not found');
  const children = await CategoryModel.findActiveChildren(cat.id);
  return {
    category: formatCategory(cat),
    subcategories: children.map(formatCategory),
  };
};

// ---- admin ----
export const adminListCategories = async () => (await CategoryModel.findAll()).map(formatCategory);

const validateParent = async (parentId, selfId = null) => {
  if (!parentId) return null;
  const parent = await CategoryModel.findById(parentId);
  if (!parent) throw httpError(404, 'Parent category not found');
  if (selfId) {
    if (Number(parentId) === Number(selfId)) throw httpError(400, 'A category cannot be its own parent');
    // walk up from the new parent: it must never reach the category itself (no cycles)
    let current = parent;
    while (current && current.parent_id) {
      if (Number(current.parent_id) === Number(selfId)) {
        throw httpError(400, 'Cannot move a category under one of its own subcategories');
      }
      current = await CategoryModel.findById(current.parent_id);
    }
  }
  return parentId;
};

export const createCategory = async (body, file) => {
  const name = cleanStr(body.name);
  if (!name) throw httpError(400, 'Category name is required');
  const slug = await uniqueSlug('categories', cleanStr(body.slug) || name);
  const parentId = await validateParent(toIntOrNull(body.parent_id));
  const id = await CategoryModel.create({
    name,
    slug,
    parent_id: parentId,
    image: file ? publicPath('categories', file.filename) : null,
    description: cleanStr(body.description),
    status: body.status === 'inactive' ? 'inactive' : 'active',
    sort_order: parseInt(body.sort_order, 10) || 0,
  });
  const created = await CategoryModel.findById(id);
  return { category: formatCategory(created) };
};

export const updateCategory = async (id, body, file) => {
  const existing = await CategoryModel.findById(id);
  if (!existing) throw httpError(404, 'Category not found');
  const data = {};
  if (body.name !== undefined) {
    const name = cleanStr(body.name);
    if (!name) throw httpError(400, 'Category name cannot be empty');
    data.name = name;
    if (!cleanStr(body.slug) && name !== existing.name) {
      data.slug = await uniqueSlug('categories', name, id);
    }
  }
  if (body.slug !== undefined && cleanStr(body.slug)) {
    data.slug = await uniqueSlug('categories', cleanStr(body.slug), id);
  }
  if (body.parent_id !== undefined) {
    data.parent_id = await validateParent(toIntOrNull(body.parent_id), id);
  }
  if (body.description !== undefined) data.description = cleanStr(body.description);
  if (body.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) throw httpError(400, 'Invalid status');
    data.status = body.status;
  }
  if (body.sort_order !== undefined) data.sort_order = parseInt(body.sort_order, 10) || 0;
  if (file) {
    data.image = publicPath('categories', file.filename);
    deleteFileBestEffort(existing.image);
  }
  if (Object.keys(data).length) await CategoryModel.update(id, data);
  const updated = await CategoryModel.findById(id);
  return { category: formatCategory(updated) };
};

export const deleteCategory = async (id) => {
  const existing = await CategoryModel.findById(id);
  if (!existing) throw httpError(404, 'Category not found');
  const childCount = await CategoryModel.countChildren(id);
  if (childCount > 0) throw httpError(409, 'Cannot delete category: it has subcategories');
  const productCount = await CategoryModel.countProducts(id);
  if (productCount > 0) throw httpError(409, 'Cannot delete category: products are assigned to it');
  await CategoryModel.delete(id);
  deleteFileBestEffort(existing.image);
  return { message: 'Category deleted successfully' };
};

export const setCategoryStatus = async (id, status) => {
  const existing = await CategoryModel.findById(id);
  if (!existing) throw httpError(404, 'Category not found');
  await CategoryModel.update(id, { status });
  return { message: `Category ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
};
