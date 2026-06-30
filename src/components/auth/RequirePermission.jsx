import Forbidden from '../../pages/Forbidden';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Per-route authorization guard.
 *
 * Wraps a route element and checks the current user's permission for the given
 * `module` against the live role-permission matrix (via usePermissions). If the
 * user lacks permission, a clear 403 page is rendered in place of the page
 * content (inside the app Layout, so navigation stays available) rather than a
 * blank screen.
 *
 * @param {string|null} module - permission module key (null => auth only)
 * @param {React.ReactNode} children - the protected route element
 */
export default function RequirePermission({ module, children }) {
  const { can } = usePermissions();

  if (!can(module)) {
    return <Forbidden />;
  }

  return children;
}
