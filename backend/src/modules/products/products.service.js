// Products business logic. Throws Error with human message; sets err.statusCode (404/409/403).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from './products.model.js';
import { CategoryModel } from '../categories/categories.model.js';
import { BrandModel } from '../brands/brands.model.js';
import { uniqueSlug, slugify } from '../../utils/slug.js';
import { toListItem } from '../../utils/productFormat.js';
import { publicPath } from '../../middleware/upload.middleware.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const httpError = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const toMoney = (v) => Math.round(Number(v) * 100) / 100;
const toMoneyOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toFlag = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);
const cleanStr = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

const toMysqlDatetime = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6] || '00'}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const discountOf = (price, mrp) => {
  const p = Number(price);
  const m = Number(mrp);
  if (!(m > 0) || !(p >= 0) || p >= m) return 0;
  return Math.round(((m - p) / m) * 100);
};

export const deleteFileBestEffort = (publicUrl) => {
  if (!publicUrl) return;
  try {
    fs.unlinkSync(path.join(BACKEND_ROOT, publicUrl));
  } catch {
    // best-effort: file may already be gone
  }
};

const formatVariant = (v) => ({
  id: v.id,
  size: v.size,
  color: v.color,
  weightLabel: v.weight_label,
  sku: v.sku,
  price: v.price != null ? Number(v.price) : null,
  mrp: v.mrp != null ? Number(v.mrp) : null,
  stock: Number(v.stock || 0),
});

const formatDetail = (row, images, variants) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  sku: row.sku,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id,
  brandId: row.brand_id,
  description: row.description,
  shortDescription: row.short_description,
  price: Number(row.price),
  mrp: Number(row.mrp),
  gstPercent: Number(row.gst_percent ?? 18),
  weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
  dimensions: row.dimensions,
  stock: Number(row.stock || 0),
  soldCount: Number(row.sold_count || 0),
  ratingAvg: Number(row.rating_avg || 0),
  ratingCount: Number(row.rating_count || 0),
  discountPercent: discountOf(row.price, row.mrp),
  status: row.status,
  isFeatured: Number(row.is_featured) === 1,
  isNewArrival: Number(row.is_new_arrival) === 1,
  isBestSeller: Number(row.is_best_seller) === 1,
  isFlashSale: Number(row.is_flash_sale) === 1,
  flashSalePrice: row.flash_sale_price != null ? Number(row.flash_sale_price) : null,
  flashSaleEndsAt: row.flash_sale_ends_at,
  metaTitle: row.meta_title,
  metaDescription: row.meta_description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  images: images.map((i) => ({ id: i.id, image_url: i.image_url, sort_order: i.sort_order })),
  variants: variants.map(formatVariant),
  category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
  subcategory: row.subcategory_id
    ? { id: row.subcategory_id, name: row.subcategory_name, slug: row.subcategory_slug }
    : null,
  brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
});

// ---- shared lookups ----
const requireCategoryBySlug = async (slug, label) => {
  const cat = await CategoryModel.findBySlug(slug);
  if (!cat) throw httpError(404, `${label} not found`);
  return cat;
};

const parseVariants = (raw) => {
  if (raw === undefined || raw === null || raw === '') return [];
  let arr = raw;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      throw httpError(400, 'Variants must be a valid JSON array');
    }
  }
  if (!Array.isArray(arr)) throw httpError(400, 'Variants must be a valid JSON array');
  return arr.map((v) => ({
    size: cleanStr(v.size),
    color: cleanStr(v.color),
    weight_label: cleanStr(v.weight_label),
    sku: cleanStr(v.sku),
    price: toMoneyOrNull(v.price),
    mrp: toMoneyOrNull(v.mrp),
    stock: Math.max(0, parseInt(v.stock, 10) || 0),
  }));
};

const generateSku = async (slug) => {
  for (;;) {
    const sku = `${slug.slice(0, 48)}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
    const dup = await ProductModel.findBySku(sku);
    if (!dup) return sku;
  }
};

// ---- public ----
export const listProducts = async (q, page, limit, offset) => {
  const filters = {};
  if (q.search) filters.search = String(q.search).trim();
  if (q.category) filters.categoryId = (await requireCategoryBySlug(String(q.category).trim(), 'Category')).id;
  if (q.subcategory) filters.subcategoryId = (await requireCategoryBySlug(String(q.subcategory).trim(), 'Subcategory')).id;
  if (q.brand) {
    const brand = await BrandModel.findBySlug(String(q.brand).trim());
    if (!brand) throw httpError(404, 'Brand not found');
    filters.brandId = brand.id;
  }
  if (q.minPrice !== undefined && q.minPrice !== '') filters.minPrice = Number(q.minPrice);
  if (q.maxPrice !== undefined && q.maxPrice !== '') filters.maxPrice = Number(q.maxPrice);
  if (q.rating !== undefined && q.rating !== '') filters.rating = Number(q.rating);
  if (q.color) filters.color = String(q.color).trim();
  if (q.size) filters.size = String(q.size).trim();
  if (q.inStock === 'true' || q.inStock === true || q.inStock === '1') filters.inStock = true;
  const sort = ['price_asc', 'price_desc', 'newest', 'popular', 'rating'].includes(q.sort) ? q.sort : 'newest';
  const { rows, total } = await ProductModel.findPublicList(filters, { sort, limit, offset });
  return { items: rows.map(toListItem), total };
};

export const featuredProducts = async () =>
  (await ProductModel.findByFlag('is_featured', 8, 'p.created_at DESC, p.id DESC')).map(toListItem);

export const newArrivalProducts = async () =>
  (await ProductModel.findByFlag('is_new_arrival', 8, 'p.created_at DESC, p.id DESC')).map(toListItem);

export const bestSellerProducts = async () =>
  (await ProductModel.findByFlag('is_best_seller', 8, 'p.sold_count DESC, p.id DESC')).map(toListItem);

export const flashSaleProducts = async () => ({
  items: (await ProductModel.findFlashSale(8)).map(toListItem),
  serverTime: new Date().toISOString(),
});

export const suggestionSearch = async (q) => {
  const term = String(q || '').trim();
  if (!term) throw httpError(400, 'Search query is required');
  const products = (await ProductModel.searchNames(term, 8)).map((r) => ({ name: r.name, slug: r.slug }));
  const categories = (await CategoryModel.searchActive(term, 8)).map((r) => ({ name: r.name, slug: r.slug }));
  const brands = (await BrandModel.searchActive(term, 8)).map((r) => ({ name: r.name, slug: r.slug }));
  return { data: products, categories, brands };
};

export const getProductDetail = async (slug) => {
  const row = await ProductModel.findBySlug(slug);
  if (!row || row.status !== 'active') throw httpError(404, 'Product not found');
  const images = await ProductModel.getImages(row.id);
  const variants = await ProductModel.getVariants(row.id);
  const { rows: relatedRows } = await ProductModel.findPublicList(
    { categoryId: row.category_id, excludeId: row.id },
    { sort: 'popular', limit: 8, offset: 0 }
  );
  const breadcrumbs = [];
  if (row.category_id) breadcrumbs.push({ name: row.category_name, slug: row.category_slug });
  if (row.subcategory_id) breadcrumbs.push({ name: row.subcategory_name, slug: row.subcategory_slug });
  breadcrumbs.push({ name: row.name, slug: row.slug });
  return {
    product: formatDetail(row, images, variants),
    related: relatedRows.map(toListItem),
    breadcrumbs,
  };
};

// ---- admin ----
export const adminListProducts = async (q, page, limit, offset) => {
  let categoryId = null;
  if (q.category !== undefined && q.category !== '' && q.category !== null) {
    const raw = String(q.category).trim();
    if (/^\d+$/.test(raw)) {
      categoryId = parseInt(raw, 10);
    } else {
      const cat = await CategoryModel.findBySlug(raw);
      if (!cat) throw httpError(404, 'Category not found');
      categoryId = cat.id;
    }
  }
  const { rows, total } = await ProductModel.findAdminList({
    search: q.search ? String(q.search).trim() : null,
    categoryId,
    status: q.status || null,
    limit,
    offset,
  });
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    price: Number(r.price),
    mrp: Number(r.mrp),
    stock: Number(r.stock || 0),
    status: r.status,
    categoryName: r.category_name,
    primaryImage: r.primary_image,
    createdAt: r.created_at,
  }));
  return { items, total };
};

const validateRelations = async ({ categoryId, subcategoryId, brandId }) => {
  const category = await CategoryModel.findById(categoryId);
  if (!category) throw httpError(404, 'Category not found');
  if (subcategoryId) {
    const sub = await CategoryModel.findById(subcategoryId);
    if (!sub) throw httpError(404, 'Subcategory not found');
  }
  if (brandId) {
    const brand = await BrandModel.findById(brandId);
    if (!brand) throw httpError(404, 'Brand not found');
  }
};

export const createProduct = async (body, files) => {
  const name = cleanStr(body.name);
  if (!name) throw httpError(400, 'Product name is required');
  const price = toMoneyOrNull(body.price);
  if (price === null || price < 0) throw httpError(400, 'A valid price is required');
  const categoryId = toIntOrNull(body.category_id);
  if (!categoryId) throw httpError(400, 'category_id is required');
  const subcategoryId = toIntOrNull(body.subcategory_id);
  const brandId = toIntOrNull(body.brand_id);
  await validateRelations({ categoryId, subcategoryId, brandId });

  const slug = await uniqueSlug('products', cleanStr(body.slug) || name);
  let sku = cleanStr(body.sku);
  if (sku) {
    const dup = await ProductModel.findBySku(sku);
    if (dup) throw httpError(409, 'SKU already exists');
  } else {
    sku = await generateSku(slugify(name) || 'product');
  }

  const data = {
    name,
    slug,
    sku,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    brand_id: brandId,
    description: cleanStr(body.description),
    short_description: cleanStr(body.short_description),
    price,
    mrp: toMoneyOrNull(body.mrp) ?? price,
    gst_percent: toMoneyOrNull(body.gst_percent) ?? 18,
    weight_kg: toMoneyOrNull(body.weight_kg),
    dimensions: cleanStr(body.dimensions),
    stock: Math.max(0, parseInt(body.stock, 10) || 0),
    status: body.status === 'inactive' ? 'inactive' : 'active',
    is_featured: toFlag(body.is_featured),
    is_new_arrival: toFlag(body.is_new_arrival),
    is_best_seller: toFlag(body.is_best_seller),
    is_flash_sale: toFlag(body.is_flash_sale),
    flash_sale_price: toMoneyOrNull(body.flash_sale_price),
    flash_sale_ends_at: toMysqlDatetime(body.flash_sale_ends_at),
    meta_title: cleanStr(body.meta_title),
    meta_description: cleanStr(body.meta_description),
  };

  const id = await ProductModel.createProduct(data);
  try {
    const images = (files || []).map((f, i) => ({
      image_url: publicPath('products', f.filename),
      sort_order: i,
    }));
    if (images.length) await ProductModel.addImages(id, images);
    const variants = parseVariants(body.variants);
    if (variants.length) await ProductModel.addVariants(id, variants);
  } catch (e) {
    await ProductModel.deleteProduct(id);
    throw e;
  }
  return getAdminProduct(id);
};

export const getAdminProduct = async (id) => {
  const row = await ProductModel.findById(id);
  if (!row) throw httpError(404, 'Product not found');
  const images = await ProductModel.getImages(row.id);
  const variants = await ProductModel.getVariants(row.id);
  return { product: formatDetail(row, images, variants) };
};

export const updateProduct = async (id, body, files) => {
  const existing = await ProductModel.findById(id);
  if (!existing) throw httpError(404, 'Product not found');

  const data = {};
  if (body.name !== undefined) {
    const name = cleanStr(body.name);
    if (!name) throw httpError(400, 'Product name cannot be empty');
    data.name = name;
    if (!cleanStr(body.slug) && name !== existing.name) {
      data.slug = await uniqueSlug('products', name, id);
    }
  }
  if (body.slug !== undefined && cleanStr(body.slug)) {
    data.slug = await uniqueSlug('products', cleanStr(body.slug), id);
  }
  if (body.sku !== undefined) {
    const sku = cleanStr(body.sku);
    if (sku && sku !== existing.sku) {
      const dup = await ProductModel.findBySku(sku);
      if (dup && Number(dup.id) !== Number(id)) throw httpError(409, 'SKU already exists');
      data.sku = sku;
    }
  }
  if (body.category_id !== undefined) {
    const categoryId = toIntOrNull(body.category_id);
    if (!categoryId) throw httpError(400, 'category_id is invalid');
    data.category_id = categoryId;
  }
  if (body.subcategory_id !== undefined) data.subcategory_id = toIntOrNull(body.subcategory_id);
  if (body.brand_id !== undefined) data.brand_id = toIntOrNull(body.brand_id);
  await validateRelations({
    categoryId: data.category_id ?? existing.category_id,
    subcategoryId: data.subcategory_id !== undefined ? data.subcategory_id : existing.subcategory_id,
    brandId: data.brand_id !== undefined ? data.brand_id : existing.brand_id,
  });
  if (body.description !== undefined) data.description = cleanStr(body.description);
  if (body.short_description !== undefined) data.short_description = cleanStr(body.short_description);
  if (body.price !== undefined) {
    const price = toMoneyOrNull(body.price);
    if (price === null || price < 0) throw httpError(400, 'A valid price is required');
    data.price = price;
  }
  if (body.mrp !== undefined) {
    const m = toMoneyOrNull(body.mrp);
    if (m !== null && m >= 0) data.mrp = m;
  }
  if (body.gst_percent !== undefined) {
    const g = toMoneyOrNull(body.gst_percent);
    if (g !== null && g >= 0) data.gst_percent = g;
  }
  if (body.weight_kg !== undefined) data.weight_kg = toMoneyOrNull(body.weight_kg);
  if (body.dimensions !== undefined) data.dimensions = cleanStr(body.dimensions);
  if (body.stock !== undefined) data.stock = Math.max(0, parseInt(body.stock, 10) || 0);
  if (body.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) throw httpError(400, 'Invalid status');
    data.status = body.status;
  }
  for (const f of ['is_featured', 'is_new_arrival', 'is_best_seller', 'is_flash_sale']) {
    if (body[f] !== undefined) data[f] = toFlag(body[f]);
  }
  if (body.flash_sale_price !== undefined) data.flash_sale_price = toMoneyOrNull(body.flash_sale_price);
  if (body.flash_sale_ends_at !== undefined) data.flash_sale_ends_at = toMysqlDatetime(body.flash_sale_ends_at);
  if (body.meta_title !== undefined) data.meta_title = cleanStr(body.meta_title);
  if (body.meta_description !== undefined) data.meta_description = cleanStr(body.meta_description);

  if (Object.keys(data).length) await ProductModel.updateProduct(id, data);

  if (files && files.length) {
    const existingImages = await ProductModel.getImages(id);
    const start = existingImages.length;
    await ProductModel.addImages(
      id,
      files.map((f, i) => ({ image_url: publicPath('products', f.filename), sort_order: start + i }))
    );
  }
  if (body.variants !== undefined) {
    await ProductModel.deleteVariantsByProduct(id);
    const variants = parseVariants(body.variants);
    if (variants.length) await ProductModel.addVariants(id, variants);
  }
  return getAdminProduct(id);
};

export const deleteProduct = async (id) => {
  const existing = await ProductModel.findById(id);
  if (!existing) throw httpError(404, 'Product not found');
  const images = await ProductModel.getImages(id);
  await ProductModel.deleteProduct(id);
  images.forEach((img) => deleteFileBestEffort(img.image_url));
  return { message: 'Product deleted successfully' };
};

export const setProductStatus = async (id, status) => {
  const existing = await ProductModel.findById(id);
  if (!existing) throw httpError(404, 'Product not found');
  await ProductModel.updateProduct(id, { status });
  return { message: `Product ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
};

export const deleteProductImage = async (productId, imageId) => {
  const img = await ProductModel.findImageById(imageId);
  if (!img || Number(img.product_id) !== Number(productId)) throw httpError(404, 'Image not found');
  await ProductModel.deleteImage(imageId);
  deleteFileBestEffort(img.image_url);
  return { message: 'Product image deleted successfully' };
};
