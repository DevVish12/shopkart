// Products HTTP layer: try/catch -> service -> response envelopes.
import fs from 'fs';
import path from 'path';
import { ok, created, paginated, fail } from '../../utils/response.js';
import { getPaginationParams, buildPagination } from '../../utils/pagination.js';
import * as ProductService from './products.service.js';
import { deleteFileBestEffort } from './products.service.js';
import { emitProductChanged } from '../../realtime.js';

const UPLOAD_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..', 'uploads', 'products');

// Best-effort cleanup of just-uploaded files when the request fails afterwards.
const cleanupUploadedFiles = (files) => {
  for (const f of files || []) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, f.filename));
    } catch {
      // ignore
    }
  }
};

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    cleanupUploadedFiles(req.files);
    if (req.file) deleteFileBestEffort(`uploads/products/${req.file.filename}`);
    return fail(res, e.message, e.statusCode || 400);
  }
};

// ---- public ----
export const list = handle(async (req, res) => {
  const { page, limit, offset } = getPaginationParams(req.query);
  const { items, total } = await ProductService.listProducts(req.query, page, limit, offset);
  return paginated(res, items, buildPagination(page, limit, total));
});

export const featured = handle(async (req, res) => {
  const items = await ProductService.featuredProducts();
  return ok(res, items);
});

export const newArrivals = handle(async (req, res) => {
  const items = await ProductService.newArrivalProducts();
  return ok(res, items);
});

export const bestSellers = handle(async (req, res) => {
  const items = await ProductService.bestSellerProducts();
  return ok(res, items);
});

export const flashSale = handle(async (req, res) => {
  const { items, serverTime } = await ProductService.flashSaleProducts();
  return res.status(200).json({ success: true, data: items, serverTime });
});

export const suggestions = handle(async (req, res) => {
  const result = await ProductService.suggestionSearch(req.query.q);
  return ok(res, result);
});

export const getBySlug = handle(async (req, res) => {
  const result = await ProductService.getProductDetail(req.params.slug);
  return ok(res, result);
});

// ---- admin ----
export const adminList = handle(async (req, res) => {
  const { page, limit, offset } = getPaginationParams(req.query);
  const { items, total } = await ProductService.adminListProducts(req.query, page, limit, offset);
  return paginated(res, items, buildPagination(page, limit, total));
});

export const create = handle(async (req, res) => {
  const { product } = await ProductService.createProduct(req.body, req.files || []);
  try { emitProductChanged('created', { id: product.id, name: product.name, slug: product.slug }); } catch {}
  return created(res, { product }, 'Product created successfully');
});

export const adminGet = handle(async (req, res) => {
  const result = await ProductService.getAdminProduct(req.params.id);
  return ok(res, result);
});

export const update = handle(async (req, res) => {
  const { product } = await ProductService.updateProduct(req.params.id, req.body, req.files || []);
  try { emitProductChanged('updated', { id: product.id, name: product.name, slug: product.slug }); } catch {}
  return ok(res, { product }, 'Product updated successfully');
});

export const remove = handle(async (req, res) => {
  const id = req.params.id;
  const result = await ProductService.deleteProduct(id);
  try { emitProductChanged('deleted', { id: Number(id) }); } catch {}
  return ok(res, null, result.message);
});

export const setStatus = handle(async (req, res) => {
  const result = await ProductService.setProductStatus(req.params.id, req.body.status);
  try { emitProductChanged('updated', { id: Number(req.params.id) }); } catch {}
  return ok(res, null, result.message);
});

export const deleteImage = handle(async (req, res) => {
  const result = await ProductService.deleteProductImage(req.params.id, req.params.imageId);
  return ok(res, null, result.message);
});
