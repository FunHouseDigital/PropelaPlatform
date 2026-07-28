const EXPECTED_OPERATIONAL_ROLES = Object.freeze([
  'Admin',
  'Superadmin',
  'Recruiter',
]);

const EXPECTED_OPERATIONAL_ROLE_SET = new Set(EXPECTED_OPERATIONAL_ROLES);

export { EXPECTED_OPERATIONAL_ROLES };

/**
 * Resolve the role published by AuthContext. The top-level role is the
 * Supabase profile role; currentUser.role preserves the legacy auth contract.
 * This helper is for UI affordances only. Persistence adapters and RLS remain
 * authoritative for every nurse request.
 */
export function getAuthenticatedRole(auth) {
  if (!auth || typeof auth !== 'object') return null;
  return auth.role ?? auth.currentUser?.role ?? null;
}

export function hasExpectedNurseOperationalRole(auth) {
  return EXPECTED_OPERATIONAL_ROLE_SET.has(getAuthenticatedRole(auth));
}

/**
 * Derive the complete nurse mutation-control model from the authenticated role.
 * Consumers may hide or disable controls with these values, but must never use
 * them to fabricate a successful command or bypass an adapter response.
 */
export function getNurseUiPermissions(auth) {
  const canOperate = hasExpectedNurseOperationalRole(auth);
  return Object.freeze({
    canCreate: canOperate,
    canEdit: canOperate,
    canChangePipeline: canOperate,
    canDelete: canOperate,
  });
}
