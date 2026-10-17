// Central permission catalog for admin RBAC.
// A permission key looks like "<module>.<action>". Roles store an array of keys.
// The frontend fetches this same catalog from GET /api/admin/roles/permissions
// so there is a single source of truth.
export const PERMISSIONS = [
  { key: 'dashboard.view', label: 'View dashboard', group: 'Dashboard' },

  { key: 'products.view', label: 'View products', group: 'Products' },
  { key: 'products.create', label: 'Create products', group: 'Products' },
  { key: 'products.edit', label: 'Edit products', group: 'Products' },
  { key: 'products.delete', label: 'Delete products', group: 'Products' },

  { key: 'categories.view', label: 'View categories', group: 'Categories' },
  { key: 'categories.create', label: 'Create categories', group: 'Categories' },
  { key: 'categories.edit', label: 'Edit categories', group: 'Categories' },
  { key: 'categories.delete', label: 'Delete categories', group: 'Categories' },

  { key: 'brands.view', label: 'View brands', group: 'Brands' },
  { key: 'brands.create', label: 'Create brands', group: 'Brands' },
  { key: 'brands.edit', label: 'Edit brands', group: 'Brands' },
  { key: 'brands.delete', label: 'Delete brands', group: 'Brands' },

  { key: 'banners.view', label: 'View banners', group: 'Banners' },
  { key: 'banners.create', label: 'Create banners', group: 'Banners' },
  { key: 'banners.edit', label: 'Edit banners', group: 'Banners' },
  { key: 'banners.delete', label: 'Delete banners', group: 'Banners' },

  { key: 'orders.view', label: 'View orders', group: 'Orders' },
  { key: 'orders.edit', label: 'Update order status / manage orders', group: 'Orders' },

  { key: 'customers.view', label: 'View customers', group: 'Customers' },
  { key: 'customers.edit', label: 'Edit / block customers', group: 'Customers' },

  { key: 'coupons.view', label: 'View coupons', group: 'Coupons' },
  { key: 'coupons.create', label: 'Create coupons', group: 'Coupons' },
  { key: 'coupons.edit', label: 'Edit coupons', group: 'Coupons' },
  { key: 'coupons.delete', label: 'Delete coupons', group: 'Coupons' },

  { key: 'reviews.view', label: 'View reviews', group: 'Reviews' },
  { key: 'reviews.moderate', label: 'Approve / reject / delete reviews', group: 'Reviews' },

  { key: 'shipping.view', label: 'View shipping zones', group: 'Shipping' },
  { key: 'shipping.edit', label: 'Edit shipping zones', group: 'Shipping' },

  { key: 'notifications.view', label: 'View notifications', group: 'Notifications' },
  { key: 'notifications.create', label: 'Send notifications', group: 'Notifications' },

  { key: 'reports.view', label: 'View reports', group: 'Reports' },

  { key: 'cms.view', label: 'View CMS pages', group: 'CMS' },
  { key: 'cms.edit', label: 'Edit CMS pages', group: 'CMS' },

  { key: 'settings.view', label: 'View settings', group: 'Settings' },
  { key: 'settings.edit', label: 'Edit settings', group: 'Settings' },

  { key: 'roles.view', label: 'View roles', group: 'Roles & Team' },
  { key: 'roles.create', label: 'Create roles', group: 'Roles & Team' },
  { key: 'roles.edit', label: 'Edit roles', group: 'Roles & Team' },
  { key: 'roles.delete', label: 'Delete roles', group: 'Roles & Team' },

  { key: 'admins.view', label: 'View team members', group: 'Roles & Team' },
  { key: 'admins.create', label: 'Add team members', group: 'Roles & Team' },
  { key: 'admins.edit', label: 'Edit team members / assign roles', group: 'Roles & Team' },
  { key: 'admins.delete', label: 'Remove team members', group: 'Roles & Team' },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const VALID_KEYS = new Set(ALL_PERMISSION_KEYS);

/** Keep only known permission keys, de-duplicated. */
export const sanitizePermissions = (perms) => {
  if (!Array.isArray(perms)) return [];
  const out = [];
  for (const p of perms) {
    if (typeof p === 'string' && VALID_KEYS.has(p) && !out.includes(p)) out.push(p);
  }
  return out;
};

/** Parse the JSON permissions column into a clean string array. */
export const parsePermissions = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return sanitizePermissions(parsed);
  } catch {
    return [];
  }
};
