import { describe, expect, it } from 'vitest';

import {
  EXPECTED_OPERATIONAL_ROLES,
  getAuthenticatedRole,
  getNurseUiPermissions,
  hasExpectedNurseOperationalRole,
} from '../nursePermissions';

describe('nurse UI permissions', () => {
  it.each(EXPECTED_OPERATIONAL_ROLES)(
    'enables every operational control for the canonical %s role',
    (role) => {
      expect(getNurseUiPermissions({ role, currentUser: { role } })).toEqual({
        canCreate: true,
        canEdit: true,
        canChangePipeline: true,
        canDelete: true,
      });
    },
  );

  it.each([null, undefined, 'Manager', 'Read-only', 'Super Admin', 'SuperAdmin'])(
    'disables mutation controls for the non-operational role %s',
    (role) => {
      expect(hasExpectedNurseOperationalRole({ role })).toBe(false);
      expect(getNurseUiPermissions({ role })).toEqual({
        canCreate: false,
        canEdit: false,
        canChangePipeline: false,
        canDelete: false,
      });
    },
  );

  it('uses the legacy currentUser role when no top-level role is published', () => {
    const auth = { currentUser: { role: 'Superadmin' } };

    expect(getAuthenticatedRole(auth)).toBe('Superadmin');
    expect(hasExpectedNurseOperationalRole(auth)).toBe(true);
  });

  it('treats the authenticated top-level role as the current UI model', () => {
    const auth = {
      role: 'Read-only',
      currentUser: { role: 'Admin' },
    };

    expect(getAuthenticatedRole(auth)).toBe('Read-only');
    expect(hasExpectedNurseOperationalRole(auth)).toBe(false);
  });
});
