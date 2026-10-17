import { CmsModel } from './cms.model.js';

export const getPublishedPage = async (slug) => {
  const page = await CmsModel.findPublishedBySlug(slug);
  if (!page) {
    const err = new Error('Page not found');
    err.statusCode = 404;
    throw err;
  }
  return page;
};

export const listPages = async (page, limit, offset) => {
  const { rows, total } = await CmsModel.findAllPaginated(limit, offset);
  return { rows, total };
};

export const createPage = async (fields) => {
  const slug = fields.slug.trim().toLowerCase();
  const existing = await CmsModel.findBySlug(slug);
  if (existing) {
    const err = new Error('A page with this slug already exists');
    err.statusCode = 409;
    throw err;
  }
  return CmsModel.create({
    slug,
    title: fields.title.trim(),
    content: fields.content,
    status: fields.status || 'draft',
  });
};

export const updatePage = async (id, fields) => {
  const existing = await CmsModel.findById(id);
  if (!existing) {
    const err = new Error('Page not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (fields.slug !== undefined) {
    const slug = fields.slug.trim().toLowerCase();
    if (slug !== existing.slug && (await CmsModel.slugTakenByOther(slug, id))) {
      const err = new Error('A page with this slug already exists');
      err.statusCode = 409;
      throw err;
    }
    patch.slug = slug;
  }
  if (fields.title !== undefined) patch.title = fields.title.trim();
  if (fields.content !== undefined) patch.content = fields.content;
  if (fields.status !== undefined) patch.status = fields.status;
  return CmsModel.update(id, patch);
};

export const deletePage = async (id) => {
  const existing = await CmsModel.findById(id);
  if (!existing) {
    const err = new Error('Page not found');
    err.statusCode = 404;
    throw err;
  }
  await CmsModel.remove(id);
  return true;
};
