import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import {
  getDashboard,
  getSales,
  getProductsReport,
  getCustomersReport,
} from './reports.controller.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---- Admin reports: /api/admin/reports (admin only) ----
export const reportsRouter = Router();
reportsRouter.use(adminAuth);

const formatCheck = [
  query('format').optional().isIn(['csv']).withMessage('format must be csv'),
];

reportsRouter.get('/dashboard',
  requirePermission('reports.view'), formatCheck, validate, getDashboard);

reportsRouter.get(
  '/sales',
  requirePermission('reports.view'),
  [
    ...formatCheck,
    query('from')
      .optional()
      .matches(DATE_RE)
      .withMessage('from must be a YYYY-MM-DD date'),
    query('to').optional().matches(DATE_RE).withMessage('to must be a YYYY-MM-DD date'),
    query('group').optional().isIn(['day', 'week', 'month']).withMessage('group must be day, week or month'),
  ],
  validate,
  getSales
);

reportsRouter.get(
  '/products',
  requirePermission('reports.view'),
  [
    ...formatCheck,
    query('type')
      .optional()
      .isIn(['best_sellers', 'low_stock', 'out_of_stock'])
      .withMessage('type must be best_sellers, low_stock or out_of_stock'),
  ],
  validate,
  getProductsReport
);

reportsRouter.get(
  '/customers',
  requirePermission('reports.view'),
  [
    ...formatCheck,
    query('type').optional().isIn(['new', 'repeat', 'top']).withMessage('type must be new, repeat or top'),
  ],
  validate,
  getCustomersReport
);
