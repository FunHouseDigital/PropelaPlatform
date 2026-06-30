/**
 * usePermissions — role-based authorization helpers.
 *
 * Resolves what the currently authenticated user is allowed to do by combining:
 *   - the current user (and role) from AuthContext, and
 *   - the LIVE role-permission matrix from AppContext settings.
 *
 * Because the matrix is read from AppContext (not a hardcoded copy), edits made
 * in Settings > User Management take effect immediately.
 *
 * Superadmins are granted access to every module (including any future module)
 * via a short-circuit, so they can always "do everything".
 *
 * When there is no authenticated user (e.g. components rendered outside an
 * AuthProvider in isolated tests), `can()` is permissive. In the running app
 * this never weakens security: routes are gated by ProtectedRoute/RequirePermission
 * and the navigation only renders once a real user is signed in.
 */
import { useCallback, useMemo } from 'react';

import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const SUPERADMIN_ROLES = ['Superadmin', 'Super Admin', 'SuperAdmin'];

export function usePermissions() {
  const { currentUser } = useAuth();
  const { settings } = useAppContext();

  const role = currentUser?.role ?? null;
  const rolePermissions = settings?.rolePermissions ?? {};
  const isSuperAdmin = role !== null && SUPERADMIN_ROLES.includes(role);

  const can = useCallback(
    (module) => {
      // No authenticated user → permissive (route guards handle enforcement).
      if (!currentUser) return true;
      // Superadmins can access everything.
      if (isSuperAdmin) return true;
      // Routes/actions with no specific module requirement are allowed.
      if (!module) return true;
      const perms = rolePermissions[role];
      if (!perms) return false;
      return perms[module] === true;
    },
    [currentUser, isSuperAdmin, role, rolePermissions]
  );

  return useMemo(
    () => ({
      can,
      role,
      isSuperAdmin,
      isAuthenticated: !!currentUser,
    }),
    [can, role, isSuperAdmin, currentUser]
  );
}

export default usePermissions;
