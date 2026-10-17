import { BannerModel } from './banners.model.js';

const parseDateTime = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Invalid date/time value');
    err.statusCode = 400;
    throw err;
  }
  return d;
};

const parseSortOrder = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error('sort_order must be a non-negative integer');
    err.statusCode = 400;
    throw err;
  }
  return n;
};

export const listActive = async (position) => {
  const pos = position && position.trim() ? position.trim() : 'home_hero';
  return BannerModel.findActive(pos);
};

export const listAll = async (page, limit, offset) => {
  const { rows, total } = await BannerModel.findAllPaginated(limit, offset);
  return { rows, total };
};

export const createBanner = async (fields, image) => {
  if (!image) {
    const err = new Error('Banner image is required');
    err.statusCode = 400;
    throw err;
  }
  if (fields.starts_at && fields.ends_at) {
    const start = new Date(fields.starts_at);
    const end = new Date(fields.ends_at);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      const err = new Error('ends_at must be after starts_at');
      err.statusCode = 400;
      throw err;
    }
  }
  return BannerModel.create({
    title: fields.title.trim(),
    subtitle: fields.subtitle ? fields.subtitle.trim() : null,
    image,
    button_text: fields.button_text ? fields.button_text.trim() : null,
    button_link: fields.button_link ? fields.button_link.trim() : null,
    position: fields.position ? fields.position.trim() : 'home_hero',
    sort_order: parseSortOrder(fields.sort_order),
    starts_at: parseDateTime(fields.starts_at),
    ends_at: parseDateTime(fields.ends_at),
    status: fields.status || 'active',
  });
};

export const updateBanner = async (id, fields, image) => {
  const existing = await BannerModel.findById(id);
  if (!existing) {
    const err = new Error('Banner not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (fields.title !== undefined) patch.title = fields.title.trim();
  if (fields.subtitle !== undefined)
    patch.subtitle = fields.subtitle ? fields.subtitle.trim() : null;
  if (image !== undefined && image !== null) patch.image = image;
  if (fields.button_text !== undefined)
    patch.button_text = fields.button_text ? fields.button_text.trim() : null;
  if (fields.button_link !== undefined)
    patch.button_link = fields.button_link ? fields.button_link.trim() : null;
  if (fields.position !== undefined) patch.position = fields.position.trim();
  if (fields.sort_order !== undefined) patch.sort_order = parseSortOrder(fields.sort_order);
  if (fields.starts_at !== undefined) patch.starts_at = parseDateTime(fields.starts_at);
  if (fields.ends_at !== undefined) patch.ends_at = parseDateTime(fields.ends_at);
  if (fields.status !== undefined) patch.status = fields.status;

  const finalStart = patch.starts_at !== undefined ? patch.starts_at : existing.starts_at;
  const finalEnd = patch.ends_at !== undefined ? patch.ends_at : existing.ends_at;
  if (finalStart && finalEnd && new Date(finalEnd) <= new Date(finalStart)) {
    const err = new Error('ends_at must be after starts_at');
    err.statusCode = 400;
    throw err;
  }

  const oldImage = patch.image ? existing.image : null;
  const updated = await BannerModel.update(id, patch);
  return { banner: updated, oldImage };
};

export const deleteBanner = async (id) => {
  const existing = await BannerModel.findById(id);
  if (!existing) {
    const err = new Error('Banner not found');
    err.statusCode = 404;
    throw err;
  }
  await BannerModel.remove(id);
  return existing.image;
};

export const setBannerStatus = async (id, status) => {
  const existing = await BannerModel.findById(id);
  if (!existing) {
    const err = new Error('Banner not found');
    err.statusCode = 404;
    throw err;
  }
  await BannerModel.updateStatus(id, status);
  return true;
};
