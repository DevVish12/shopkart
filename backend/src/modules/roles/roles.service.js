// Roles business logic. Throws Error with err.statusCode on failure.
import { RoleModel } from './roles.model.js';
import { PERMISSIONS } from './permissions.js';

const failWith = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

export const listRoles = async () => {
  const roles = await RoleModel.list();
  return { roles };
};

export const getRole = async (id) => {
  const role = await RoleModel.findById(id);
  if (!role) throw failWith(404, 'Role not found');
  return { role };
};

export const getPermissionCatalog = async () => ({ permissions: PERMISSIONS });

export const createRole = async ({ name, slug, description, permissions }) => {
  if (!name || !String(name).trim()) throw failWith(400, 'Role name is required');
  const finalSlug = String(slug || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (!finalSlug) throw failWith(400, 'Invalid role slug');
  const existing = await RoleModel.findBySlug(finalSlug);
  if (existing) throw failWith(409, 'A role with this slug already exists');
  const role = await RoleModel.create({ name, slug: finalSlug, description, permissions });
  return { role };
};

export const updateRole = async (id, { name, description, permissions }) => {
  const role = await RoleModel.findById(id);
  if (!role) throw failWith(404, 'Role not found');
  if (!name || !String(name).trim()) throw failWith(400, 'Role name is required');
  // System (built-in) roles keep their locked permission set — only name/description may change.
  const perms = Number(role.is_system) === 1 ? undefined : permissions;
  const updated = await RoleModel.update(id, { name, description, permissions: perms });
  return { role: updated };
};

export const deleteRole = async (id) => {
  const role = await RoleModel.findById(id);
  if (!role) throw failWith(404, 'Role not found');
  if (role.is_system) throw failWith(400, 'System roles cannot be deleted');
  const assigned = await RoleModel.countAdmins(id);
  if (assigned > 0) throw failWith(400, `Cannot delete: ${assigned} team member(s) still use this role`);
  const ok = await RoleModel.delete(id);
  if (!ok) throw failWith(400, 'Could not delete role');
  return { deleted: true };
};
