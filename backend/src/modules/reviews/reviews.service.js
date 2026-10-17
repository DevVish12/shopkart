// Reviews business logic. Throws Error with human message; sets err.statusCode (404/409/403).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReviewModel } from './reviews.model.js';
import { ProductModel } from '../products/products.model.js';
import { publicPath } from '../../middleware/upload.middleware.js';
import { notify } from '../../utils/notify.js';
import { emitReviewCreated } from '../../realtime.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const httpError = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const cleanStr = (v, max) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
};

export const deleteFileBestEffort = (publicUrl) => {
  if (!publicUrl) return;
  try {
    fs.unlinkSync(path.join(BACKEND_ROOT, publicUrl));
  } catch {
    // best-effort
  }
};

const formatReview = (r, images = []) => ({
  id: r.id,
  productId: r.product_id,
  rating: r.rating,
  title: r.title,
  comment: r.comment,
  status: r.status,
  images,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ---- public product-page listing ----
export const listProductReviews = async (slug, sort, page, limit, offset) => {
  const product = await ProductModel.findBySlug(slug);
  if (!product || product.status !== 'active') throw httpError(404, 'Product not found');
  const { rows, total } = await ReviewModel.findApprovedByProduct(product.id, { sort, limit, offset });
  const ids = rows.map((r) => r.id);
  const imageRows = await ReviewModel.getImagesByReviewIds(ids);
  const byReview = new Map();
  imageRows.forEach((im) => {
    if (!byReview.has(im.review_id)) byReview.set(im.review_id, []);
    byReview.get(im.review_id).push(im.image_url);
  });
  const data = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    images: byReview.get(r.id) || [],
    userName: r.user_name || 'Verified Buyer',
    created_at: r.created_at,
  }));
  const summary = await ReviewModel.summaryByProduct(product.id);
  return { data, total, summary };
};

// ---- customer ----
export const createReview = async (userId, body, files) => {
  const productId = parseInt(body.productId, 10);
  if (!Number.isFinite(productId) || productId < 1) throw httpError(400, 'A valid productId is required');
  const rating = parseInt(body.rating, 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw httpError(400, 'Rating must be between 1 and 5');
  const product = await ProductModel.findById(productId);
  if (!product) throw httpError(404, 'Product not found');

  const id = await ReviewModel.create({
    product_id: productId,
    user_id: userId,
    rating,
    title: cleanStr(body.title, 255),
    comment: cleanStr(body.comment, 5000),
    status: 'pending',
  });
  const imageUrls = (files || []).map((f) => publicPath('reviews', f.filename));
  if (imageUrls.length) await ReviewModel.addImages(id, imageUrls);

  try {
    await notify({
      userId: null,
      type: 'new_review',
      title: 'New product review',
      message: `A new ${rating}-star review was submitted for "${product.name}".`,
    });
  } catch {
    // notifications are best-effort
  }
  const created = await ReviewModel.findById(id);
  const review = formatReview(created, imageUrls);
  // Emit in the admin list shape so the live row renders identically.
  try {
    emitReviewCreated({
      id: created.id,
      rating: created.rating,
      title: created.title,
      comment: created.comment,
      status: created.status,
      created_at: created.created_at,
      images: imageUrls,
    });
  } catch {}
  return { review };
};

export const updateReview = async (userId, id, body) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw httpError(404, 'Review not found');
  if (Number(review.user_id) !== Number(userId)) throw httpError(403, 'You can only edit your own reviews');
  const data = {};
  if (body.rating !== undefined) {
    const rating = parseInt(body.rating, 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw httpError(400, 'Rating must be between 1 and 5');
    data.rating = rating;
  }
  if (body.title !== undefined) data.title = cleanStr(body.title, 255);
  if (body.comment !== undefined) data.comment = cleanStr(body.comment, 5000);
  if (!Object.keys(data).length) throw httpError(400, 'Nothing to update');
  await ReviewModel.update(id, data);
  if (review.status === 'approved') await ReviewModel.recalcProductRating(review.product_id);
  const updated = await ReviewModel.findById(id);
  const imageRows = await ReviewModel.getImagesByReviewIds([id]);
  return { review: formatReview(updated, imageRows.map((im) => im.image_url)) };
};

export const deleteReview = async (userId, id) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw httpError(404, 'Review not found');
  if (Number(review.user_id) !== Number(userId)) throw httpError(403, 'You can only delete your own reviews');
  const wasApproved = review.status === 'approved';
  const imageRows = await ReviewModel.getImagesByReviewIds([id]);
  await ReviewModel.delete(id);
  imageRows.forEach((im) => deleteFileBestEffort(im.image_url));
  if (wasApproved) await ReviewModel.recalcProductRating(review.product_id);
  return { message: 'Review deleted successfully' };
};

// ---- admin ----
export const adminListReviews = async (q, page, limit, offset) => {
  const { rows, total } = await ReviewModel.findAdminList({
    status: q.status || null,
    limit,
    offset,
  });
  const data = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    status: r.status,
    created_at: r.created_at,
    product: r.product_id ? { id: r.product_id, name: r.product_name } : null,
    user: r.user_id ? { id: r.user_id, name: r.user_name } : null,
  }));
  return { data, total };
};

export const approveReview = async (id) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw httpError(404, 'Review not found');
  await ReviewModel.update(id, { status: 'approved' });
  await ReviewModel.recalcProductRating(review.product_id);
  try {
    await notify({
      userId: review.user_id,
      type: 'review_approved',
      title: 'Your review was approved',
      message: `Your review for "${review.product_name || 'a product'}" is now visible.`,
    });
  } catch {
    // best-effort
  }
  return { message: 'Review approved successfully' };
};

export const rejectReview = async (id) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw httpError(404, 'Review not found');
  const wasApproved = review.status === 'approved';
  await ReviewModel.update(id, { status: 'rejected' });
  if (wasApproved) await ReviewModel.recalcProductRating(review.product_id);
  try {
    await notify({
      userId: review.user_id,
      type: 'review_rejected',
      title: 'Your review was not approved',
      message: `Your review for "${review.product_name || 'a product'}" did not meet our guidelines.`,
    });
  } catch {
    // best-effort
  }
  return { message: 'Review rejected successfully' };
};

export const adminDeleteReview = async (id) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw httpError(404, 'Review not found');
  const wasApproved = review.status === 'approved';
  const imageRows = await ReviewModel.getImagesByReviewIds([id]);
  await ReviewModel.delete(id);
  imageRows.forEach((im) => deleteFileBestEffort(im.image_url));
  if (wasApproved) await ReviewModel.recalcProductRating(review.product_id);
  return { message: 'Review deleted successfully' };
};
