export const getPaginationParams = (q = {}, defaults = {}) => {
  const maxLimit = defaults.maxLimit || 100;
  let page = parseInt(q.page, 10);
  if (!Number.isFinite(page) || page < 1) page = defaults.page || 1;
  let limit = parseInt(q.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaults.limit || 20;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, offset: (page - 1) * limit };
};

export const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
