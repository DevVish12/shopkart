import { validationResult } from 'express-validator';
import { fail } from '../utils/response.js';

// Runs after express-validator chains; returns 400 { success:false, errors }.
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      'Validation failed',
      400,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  return next();
};
