// Roles routes — mounted at /api/admin/roles.
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware.js';
import { adminAuth, requirePermission } from '../../middleware/admin.middleware.js';
import * as ctrl from './roles.controller.js';

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid id')];

const roleFields = (optional) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('name').isString().trim().notEmpty().withMessage('name is required')),
    opt(body('slug').isString().trim().notEmpty().withMessage('slug must be a non-empty string')),
    opt(body('description').isString().withMessage('description must be a string')),
    opt(body('permissions').isArray().withMessage('permissions must be an array')),
  ];
};

export const rolesRouter = Router();
rolesRouter.use(adminAuth);

// Any signed-in admin can read the catalog (needed for the role editor UI).
rolesRouter.get('/permissions', ctrl.permissionCatalog);

rolesRouter.get('/', requirePermission('roles.view'), ctrl.list);

rolesRouter.get('/:id', requirePermission('roles.view'), idParam, validate, ctrl.detail);

rolesRouter.post('/', requirePermission('roles.create'), roleFields(false), validate, ctrl.create);

rolesRouter.put('/:id', requirePermission('roles.edit'), [...idParam, ...roleFields(true)], validate, ctrl.update);

rolesRouter.delete('/:id', requirePermission('roles.delete'), idParam, validate, ctrl.remove);
