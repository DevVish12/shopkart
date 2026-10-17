// Products routes. Public mounted at /api/products, admin at /api/admin/products.
// Route order matters: specific paths first, /:slug/reviews before /:slug.
import { Router } from 'express';
import { body, param, query as qv } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadFor } from '../../middleware/upload.middleware.js';
import * as c from './products.controller.js';
import { listByProduct } from '../reviews/reviews.controller.js';

const productUpload = uploadFor('products');

const idParam = [param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid product id'), validate];

const productFields = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('slug').optional().trim().isLength({ max: 255 }),
  body('sku').optional().trim().isLength({ max: 100 }),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('mrp').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  body('category_id').optional().isInt({ min: 1, max: 100 }).withMessage('category_id must be a positive integer'),
  body('subcategory_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 100 }),
  body('brand_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 100 }),
  body('stock').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('variants').optional().custom((v) => {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    if (!Array.isArray(arr)) throw new Error('Variants must be a JSON array');
    return true;
  }),
];

export const productsPublicRouter = Router();

productsPublicRouter.get(
  '/',
  [
    qv('sort').optional().isIn(['price_asc', 'price_desc', 'newest', 'popular', 'rating']),
    qv('rating').optional().isFloat({ min: 0, max: 5 }),
    qv('minPrice').optional().isFloat({ min: 0 }),
    qv('maxPrice').optional().isFloat({ min: 0 }),
    qv('page').optional().isInt({ min: 1, max: 100 }),
    qv('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  c.list
);
productsPublicRouter.get('/featured', c.featured);
productsPublicRouter.get('/new-arrivals', c.newArrivals);
productsPublicRouter.get('/best-sellers', c.bestSellers);
productsPublicRouter.get('/flash-sale', c.flashSale);
productsPublicRouter.get(
  '/suggestions',
  [qv('q').trim().notEmpty().withMessage('Search query is required'), validate],
  c.suggestions
);
productsPublicRouter.get(
  '/:slug/reviews',
  [
    param('slug').trim().notEmpty().withMessage('Invalid product slug'),
    qv('sort').optional().isIn(['recent', 'helpful']),
    qv('page').optional().isInt({ min: 1, max: 100 }),
    qv('limit').optional().isInt({ min: 1, max: 100 }),
    validate,
  ],
  listByProduct
);
productsPublicRouter.get(
  '/:slug',
  [param('slug').trim().notEmpty().withMessage('Invalid product slug'), validate],
  c.getBySlug
);

export const productsAdminRouter = Router();
productsAdminRouter.use(adminAuth);

productsAdminRouter.get('/',
  requirePermission('products.view'), c.adminList);

productsAdminRouter.post(
  '/',
  requirePermission('products.create'),
  productUpload.array('images[]', 10),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').notEmpty().withMessage('Price is required').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('category_id').notEmpty().withMessage('category_id is required').isInt({ min: 1, max: 100 }),
    ...productFields,
  ],
  validate,
  c.create
);

productsAdminRouter.get('/:id',
  requirePermission('products.view'), idParam, c.adminGet);

productsAdminRouter.put(
  '/:id',
  requirePermission('products.edit'),
  productUpload.array('images[]', 10),
  [param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid product id'), ...productFields, validate],
  c.update
);

productsAdminRouter.delete('/:id',
  requirePermission('products.delete'), idParam, c.remove);

productsAdminRouter.put(
  '/:id/status',
  requirePermission('products.edit'),
  [
    param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid product id'),
    body('status').notEmpty().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validate,
  ],
  c.setStatus
);

productsAdminRouter.delete(
  '/:id/images/:imageId',
  requirePermission('products.delete'),
  [
    param('id').isInt({ min: 1, max: 100 }).withMessage('Invalid product id'),
    param('imageId').isInt({ min: 1, max: 100 }).withMessage('Invalid image id'),
    validate,
  ],
  c.deleteImage
);
