/**
 * Unit tests for AuthProvider / useAuth (Task 8.5).
 *
 * Covers the phased-rollout inert state when the flag is OFF (Req 9.1) and the
 * role lookup from `profiles` for UI gating when the flag is ON (Req 4.1, 4.2).
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
  const { role, loading, enabled, user } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="user">{user?.id ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  flag.value = false;
});

// DEFERRED: Supabase auth-UI is deferred; re-enable when it ships (hybrid: flag OFF uses hardened localStorage auth).
describe.skip('AuthProvider', () => {
  it('is inert (not loading, disabled) on the legacy path when the flag is OFF (Req 9.1)', () => {
    flag.value = false;
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

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
