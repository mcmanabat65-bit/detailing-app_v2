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
  // Advancing a booking's lifecycle status (confirm, on-going, completed,
  // no-show, cancel). Granted to plain admins.
  BOOKINGS_STATUS: 'bookings.status',
  // Assigning detailers to a booking. Granted to plain admins.
  BOOKINGS_DETAILERS: 'bookings.detailers',
  // Managing a booking's add-ons. Granted to plain admins.
  BOOKINGS_ADDONS: 'bookings.addons',
  // Remaining booking edits — delete, and slot blocking on the schedule.
  // Super only.
  BOOKINGS_EDIT: 'bookings.edit',
  SCHEDULE_VIEW: 'schedule.view',
  MONITOR_VIEW: 'monitor.view',
  // Read-only access to the VIP members list + profile pages. Granted to admin
  // (e.g. the barista looking up a member's VIP status). No write actions.
  MEMBERS_VIEW: 'members.view',
  MEMBERS_MANAGE: 'members.manage',
  CARS_MANAGE: 'cars.manage',
  COFFEES_MANAGE: 'coffees.manage',
  INVENTORY_MANAGE: 'inventory.manage',
  // Barista POS — serving VIP coffee + deducting ingredients. Granted to admin.
  POS_SERVE: 'pos.serve',
  SERVICES_MANAGE: 'services.manage',
  CATEGORIES_MANAGE: 'categories.manage',
  DETAILERS_MANAGE: 'detailers.manage',
  TESTIMONIALS_MANAGE: 'testimonials.manage',
  ADDONS_MANAGE: 'addons.manage',
  SETTINGS_VIEW: 'settings.view',
  STAFF_MANAGE: 'staff.manage',
  REPORTS_VIEW: 'reports.view',
};

// Permissions granted to a plain 'admin'. A 'super_admin' implicitly has all.
const ADMIN_ALLOWED = new Set([
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.BOOKINGS_VIEW,
  PERMISSIONS.BOOKINGS_CREATE,
  PERMISSIONS.BOOKINGS_STATUS,
  PERMISSIONS.BOOKINGS_DETAILERS,
  PERMISSIONS.BOOKINGS_ADDONS,
  PERMISSIONS.SCHEDULE_VIEW,
  PERMISSIONS.MONITOR_VIEW,
  PERMISSIONS.MEMBERS_VIEW,
  PERMISSIONS.POS_SERVE,
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
