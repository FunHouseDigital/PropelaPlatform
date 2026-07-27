/**
 * Unit tests for AuthProvider / useAuth (hybrid auth).
 *
 * Flag OFF (default / live) is NOT inert — it is the hardened-localStorage auth
 * path, which publishes the legacy contract (currentUser/isAuthenticated/
 * login/logout) while leaving the Supabase-specific fields inert (enabled:false)
 * and never touching the Supabase client. Flag ON is the Supabase path, which
 * hydrates the session and looks up the role from `profiles` for UI gating
 * (Req 4.1, 4.2, 4.7).
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flag = { value: false };

vi.mock('../../lib/featureFlags', () => ({
  isFeatureEnabled: () => flag.value,
}));

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('../../lib/auth', () => ({
  getSession: (...args) => getSessionMock(...args),
  signIn: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: (...args) => onAuthStateChangeMock(...args),
  isSessionExpired: () => false,
}));

const profileMaybeSingle = vi.fn();
vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: profileMaybeSingle }),
      }),
    }),
  }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

function Probe() {
  const { role, loading, enabled, user, currentUser, isAuthenticated, login, logout } =
    useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="user">{user?.id ?? 'none'}</span>
      <span data-testid="currentUser">{currentUser?.id ?? 'none'}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="hasLegacyApi">
        {String(typeof login === 'function' && typeof logout === 'function')}
      </span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  flag.value = false;
});

describe('AuthProvider', () => {
  it('serves the hardened-localStorage legacy contract and leaves Supabase inert when the flag is OFF', () => {
    flag.value = false;
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // The legacy (hardened-localStorage) path is active — NOT inert — so the
    // legacy auth contract is present and signed-out by default.
    expect(screen.getByTestId('hasLegacyApi').textContent).toBe('true');
    expect(screen.getByTestId('currentUser').textContent).toBe('none');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    // The Supabase side is inert on the legacy path: it never loads and never
    // touches the Supabase auth client.
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('enabled').textContent).toBe('false');
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('hydrates the session and looks up the role from profiles when the flag is ON (Req 4.1, 4.2)', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({
      session: { user: { id: 'user-1' }, expires_at: Math.floor(Date.now() / 1000) + 3600 },
      error: null,
    });
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('Admin');
    });
    expect(screen.getByTestId('user').textContent).toBe('user-1');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    // The Supabase profile role is surfaced through the derived legacy contract
    // (currentUser + isAuthenticated) that the RBAC layer (usePermissions) reads.
    expect(screen.getByTestId('currentUser').textContent).toBe('user-1');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });

  it('resolves role to null when the user has no profile row (Req 4.7)', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({
      session: { user: { id: 'user-2' }, expires_at: Math.floor(Date.now() / 1000) + 3600 },
      error: null,
    });
    profileMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('role').textContent).toBe('none');
  });
});
