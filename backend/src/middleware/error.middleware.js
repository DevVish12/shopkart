import multer from 'multer';
import { fail } from '../utils/response.js';

export const notFound = (req, res) => fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);

// Central error handler — always returns the error envelope.
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[error]', err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return fail(res, 'File too large. Maximum 5MB allowed.', 400);
    return fail(res, err.message || 'File upload failed', 400);
  }

  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = status === 500 ? 'Internal server error' : err.message || 'Something went wrong';
  return fail(res, message, status);
};
