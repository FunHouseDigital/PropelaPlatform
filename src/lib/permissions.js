/**
 * Central mapping of application routes to the permission "module" that gates
 * them. Module keys correspond to the columns of `settings.rolePermissions`
 * (see seedSettings.js): Dashboard, Nurses, Acquisition, Cohorts, Outreach,
 * Placements, Analytics, Settings.
 *
 * Both the route guards (App.jsx) and the navigation UI (Sidebar /
 * MobileBottomNav) read from this single source so that what a user can reach
 * by URL and what they can see in the nav always stay in sync.
 *
 * A value of `null` means the route requires authentication only (no specific
 * module permission) — e.g. personal notifications, help, and the system
 * status page, which every signed-in user may access.
 */
export const ROUTE_PERMISSIONS = {
  '/': 'Dashboard',
  '/nurses': 'Nurses',
  '/acquisition': 'Acquisition',
  '/cohorts': 'Cohorts',
  '/outreach': 'Outreach',
  '/placements': 'Placements',
  '/analytics': 'Analytics',
  '/reports': 'Analytics',
  '/documents': 'Nurses',
  '/communications': 'Outreach',
  '/integrations': 'Settings',
  '/audit': 'Settings',
  '/automations': 'Settings',
  '/notifications': null,
  '/help': null,
  '/settings': 'Settings',
  '/status': null,
};

/**
 * Resolve the required module for a given route path.
 * @param {string} path
 * @returns {string|null} module key, or null if the route needs auth only
 */
export function getModuleForPath(path) {
  return Object.prototype.hasOwnProperty.call(ROUTE_PERMISSIONS, path)
    ? ROUTE_PERMISSIONS[path]
    : null;
}
