// Standard API envelopes (see docs/API_CONTRACT.md).

export const ok = (res, data = null, message, statusCode = 200) => {
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  return res.status(statusCode).json(body);
};

export const created = (res, data = null, message) => ok(res, data, message, 201);

export const paginated = (res, data, pagination, message) => {
  const body = { success: true, data, pagination };
  if (message !== undefined) body.message = message;
  return res.status(200).json(body);
};

export const fail = (res, message = 'Something went wrong', statusCode = 400, errors) => {
  const body = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
};
