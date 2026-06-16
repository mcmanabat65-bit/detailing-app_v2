// ---------------------------------------------------------------------------
// Admin role & permission model
// ---------------------------------------------------------------------------
// Two admin tiers:
//   super_admin — the boss; unrestricted access to everything.
//   admin       — limited staff (e.g. the barista). Can create and view
//                 bookings + schedule + monitor, but cannot edit bookings,
//                 manage members/cars/coffees/services/etc., or open settings.
//
// Enforcement is UI-level (see ProtectedRoute, AdminLayout, and per-page
// gating). Roles are resolved from the `admin_users` table in AppContext.
// ---------------------------------------------------------------------------

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
};

// Canonical permission keys. Use these everywhere instead of raw strings.
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_EDIT: 'bookings.edit',
  SCHEDULE_VIEW: 'schedule.view',
  MONITOR_VIEW: 'monitor.view',
  MEMBERS_MANAGE: 'members.manage',
  CARS_MANAGE: 'cars.manage',
  COFFEES_MANAGE: 'coffees.manage',
  SERVICES_MANAGE: 'services.manage',
  CATEGORIES_MANAGE: 'categories.manage',
  DETAILERS_MANAGE: 'detailers.manage',
  TESTIMONIALS_MANAGE: 'testimonials.manage',
  ADDONS_MANAGE: 'addons.manage',
  SETTINGS_VIEW: 'settings.view',
  STAFF_MANAGE: 'staff.manage',
};

// Permissions granted to a plain 'admin'. A 'super_admin' implicitly has all.
const ADMIN_ALLOWED = new Set([
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.BOOKINGS_VIEW,
  PERMISSIONS.BOOKINGS_CREATE,
  PERMISSIONS.SCHEDULE_VIEW,
  PERMISSIONS.MONITOR_VIEW,
]);

/**
 * Returns true if `role` is allowed to perform `permission`.
 * Unknown / null roles are denied.
 */
export function can(role, permission) {
  if (role === ROLES.SUPER_ADMIN) return true;
  if (role === ROLES.ADMIN) return ADMIN_ALLOWED.has(permission);
  return false;
}

export const isValidRole = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
