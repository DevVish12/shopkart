// Roles controller — thin HTTP layer over the service.
import { ok, created, fail } from '../../utils/response.js';
import * as roleService from './roles.service.js';

const handle = (fn) => async (req, res) => {
  try {
    return ok(res, await fn(req));
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const list = handle(async () => roleService.listRoles());

export const detail = handle(async (req) => roleService.getRole(req.params.id));

export const permissionCatalog = handle(async () => roleService.getPermissionCatalog());

export const create = async (req, res) => {
  try {
    const result = await roleService.createRole(req.body);
    return created(res, result, 'Role created successfully');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const update = handle(async (req) => roleService.updateRole(req.params.id, req.body));

export const remove = handle(async (req) => roleService.deleteRole(req.params.id));
