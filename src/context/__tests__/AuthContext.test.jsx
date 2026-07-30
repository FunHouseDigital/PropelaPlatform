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

import { useEffect } from 'react';

import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flag = { value: false };

vi.mock('../../lib/featureFlags', () => ({
  isFeatureEnabled: () => flag.value,
}));

const getSessionMock = vi.fn();
const signInMock = vi.fn();
const sessionExpiredMock = vi.fn(() => false);
let authListener = null;
const onAuthStateChangeMock = vi.fn((listener) => {
  authListener = listener;
  return {
    data: { subscription: { unsubscribe: vi.fn() } },
  };
});

vi.mock('../../lib/auth', () => ({
  getSession: (...args) => getSessionMock(...args),
  signIn: (...args) => signInMock(...args),
  signOut: vi.fn(),
  onAuthStateChange: (...args) => onAuthStateChangeMock(...args),
  isSessionExpired: (...args) => sessionExpiredMock(...args),
}));

const profileMaybeSingle = vi.fn();
const profileEqMock = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: profileEqMock,
      }),
    }),
  }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

let latestAuth = null;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function Probe() {
  const auth = useAuth();
  useEffect(() => {
    latestAuth = auth;
  }, [auth]);
  const { role, loading, enabled, user, currentUser, isAuthenticated, login, logout, readiness } =
    auth;
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="user">{user?.id ?? 'none'}</span>
      <span data-testid="currentUser">{currentUser?.id ?? 'none'}</span>
      <span data-testid="currentUserRole">{currentUser?.role ?? 'none'}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="readiness">{`${readiness.status}:${readiness.authEpoch}`}</span>
      <span data-testid="hasLegacyApi">
        {String(typeof login === 'function' && typeof logout === 'function')}
      </span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authListener = null;
  latestAuth = null;
  sessionExpiredMock.mockReturnValue(false);
  flag.value = false;
});

describe('AuthProvider', () => {
  it('serves the hardened-localStorage legacy contract and leaves Supabase inert when the flag is OFF', () => {
    flag.value = false;
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
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
      </AuthProvider>
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
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  it('commits explicit sign-ins synchronously to the gateway and advances one epoch per sign-in', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({ session: null, error: null });
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });
    const first = {
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const refreshed = { ...first, access_token: 'redacted-refresh' };
    signInMock
      .mockResolvedValueOnce({ data: { session: first }, error: null })
      .mockResolvedValueOnce({ data: { session: first }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('signedOut:0'));

    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');
    expect(screen.getByTestId('role')).toHaveTextContent('Admin');
    expect(profileMaybeSingle).toHaveBeenCalledTimes(1);
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      userId: 'user-1',
      authEpoch: 1,
      error: null,
    });

    await act(async () => {
      authListener('SIGNED_IN', first);
      authListener('TOKEN_REFRESHED', refreshed);
      await Promise.resolve();
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');
    expect(screen.getByTestId('role')).toHaveTextContent('Admin');
    expect(profileMaybeSingle).toHaveBeenCalledTimes(3);

    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
    expect(profileMaybeSingle).toHaveBeenCalledTimes(4);
  });

  it('keeps a completed sign-in authoritative over deferred hydration and callback ordering', async () => {
    flag.value = true;
    const hydration = deferred();
    const signInResult = deferred();
    const callbackSession = {
      access_token: 'callback-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const returnedSession = {
      access_token: 'returned-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    };
    getSessionMock.mockReturnValue(hydration.promise);
    signInMock.mockReturnValue(signInResult.promise);
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId('readiness')).toHaveTextContent('initializing:0');

    let signInPromise;
    await act(async () => {
      signInPromise = latestAuth.signIn('user@example.test', 'password');
      authListener('SIGNED_IN', callbackSession);
      signInResult.resolve({ data: { session: returnedSession }, error: null });
      await signInPromise;
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: returnedSession,
      userId: 'user-1',
      authEpoch: 1,
    });

    await act(async () => {
      hydration.resolve({ session: null, error: null });
      await hydration.promise;
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');
  });

  it('ignores a delayed same-user SIGNED_IN callback from an older explicit epoch', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({ session: null, error: null });
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });
    const first = {
      access_token: 'older-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const second = {
      access_token: 'newer-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    };
    signInMock
      .mockResolvedValueOnce({ data: { session: first }, error: null })
      .mockResolvedValueOnce({ data: { session: second }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('signedOut:0'));
    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
      await latestAuth.signIn('user@example.test', 'password');
      authListener('SIGNED_IN', first);
    });

    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: second,
      userId: 'user-1',
      authEpoch: 2,
    });
  });

  it('publishes expired hydrated sessions as expired and the gateway fails closed', async () => {
    flag.value = true;
    const expired = { user: { id: 'user-3' }, expires_at: 1 };
    getSessionMock.mockResolvedValue({ session: expired, error: null });
    sessionExpiredMock.mockImplementation((session) => session === expired);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('expired:0'));
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: null,
      userId: null,
      error: expect.any(Error),
    });
  });

  it('invalidates only the matching server-confirmed epoch and blocks until newer sign-in', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({ session: null, error: null });
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });
    const first = {
      access_token: 'first-session-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const second = {
      access_token: 'second-session-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    signInMock
      .mockResolvedValueOnce({ data: { session: first }, error: null })
      .mockResolvedValueOnce({ data: { session: second }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('signedOut:0'));

    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
    });
    let invalidated;
    await act(async () => {
      invalidated = latestAuth.invalidateSession({ userId: 'user-1', authEpoch: 1 });
    });
    expect(invalidated).toBe(true);
    expect(screen.getByTestId('readiness')).toHaveTextContent('expired:1');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      error: expect.any(Error),
    });

    await act(async () => {
      authListener('SIGNED_IN', first);
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('expired:1');

    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
    let staleInvalidation;
    await act(async () => {
      staleInvalidation = latestAuth.invalidateSession({ userId: 'user-1', authEpoch: 1 });
    });
    expect(staleInvalidation).toBe(false);
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
  });

  it('retains an invalidated principal boundary across another principal sign-in', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({ session: null, error: null });
    profileMaybeSingle
      .mockResolvedValueOnce({ data: { role: 'Recruiter' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'Superadmin' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'Recruiter' }, error: null });
    const invalidatedA = {
      access_token: 'invalidated-a-token',
      user: { id: 'principal-a' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const activeB = {
      access_token: 'active-b-token',
      user: { id: 'principal-b' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const recoveredA = {
      access_token: 'recovered-a-token',
      user: { id: 'principal-a' },
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    };
    signInMock
      .mockResolvedValueOnce({ data: { session: invalidatedA }, error: null })
      .mockResolvedValueOnce({ data: { session: activeB }, error: null })
      .mockResolvedValueOnce({ data: { session: recoveredA }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('signedOut:0'));

    await act(async () => {
      await latestAuth.signIn('principal-a@example.test', 'password');
    });
    act(() => {
      expect(latestAuth.invalidateSession({ userId: 'principal-a', authEpoch: 1 })).toBe(true);
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('expired:1');

    await act(async () => {
      await latestAuth.signIn('principal-b@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
    expect(screen.getByTestId('role')).toHaveTextContent('Superadmin');
    expect(screen.getByTestId('currentUserRole')).toHaveTextContent('Superadmin');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: activeB,
      userId: 'principal-b',
      authEpoch: 2,
      error: null,
    });
    const roleLookupsBeforeDelayedCallback = profileMaybeSingle.mock.calls.length;
    expect(roleLookupsBeforeDelayedCallback).toBe(2);
    expect(profileEqMock).toHaveBeenLastCalledWith('user_id', 'principal-b');

    // A's delayed ordinary callback is still rejected after B signs in. It
    // cannot replace B, advance B's epoch, or start a role lookup that would
    // erase B's effective role and currentUser permissions.
    await act(async () => {
      authListener('SIGNED_IN', invalidatedA);
      await Promise.resolve();
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');
    expect(screen.getByTestId('role')).toHaveTextContent('Superadmin');
    expect(screen.getByTestId('currentUserRole')).toHaveTextContent('Superadmin');
    expect(profileMaybeSingle).toHaveBeenCalledTimes(roleLookupsBeforeDelayedCallback);
    expect(profileEqMock).toHaveBeenLastCalledWith('user_id', 'principal-b');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: activeB,
      userId: 'principal-b',
      authEpoch: 2,
      error: null,
    });

    // A can still recover through its own successful explicit sign-in, which
    // clears A's boundary without weakening any other principal boundary.
    await act(async () => {
      await latestAuth.signIn('principal-a@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:3');
    expect(screen.getByTestId('role')).toHaveTextContent('Recruiter');
    expect(screen.getByTestId('currentUserRole')).toHaveTextContent('Recruiter');
    expect(profileMaybeSingle).toHaveBeenCalledTimes(3);
    expect(profileEqMock).toHaveBeenLastCalledWith('user_id', 'principal-a');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: recoveredA,
      userId: 'principal-a',
      authEpoch: 3,
      error: null,
    });
  });

  it('rejects delayed same-user SIGNED_IN sessions after invalidating the newer epoch', async () => {
    flag.value = true;
    getSessionMock.mockResolvedValue({ session: null, error: null });
    profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });
    const older = {
      access_token: 'older-session-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const invalidated = {
      access_token: 'invalidated-session-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const refreshed = {
      access_token: 'refreshed-session-token',
      user: { id: 'user-1' },
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    };
    signInMock
      .mockResolvedValueOnce({ data: { session: older }, error: null })
      .mockResolvedValueOnce({ data: { session: invalidated }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('signedOut:0'));

    await act(async () => {
      await latestAuth.signIn('user@example.test', 'password');
      await latestAuth.signIn('user@example.test', 'password');
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:2');

    act(() => {
      expect(latestAuth.invalidateSession({ userId: 'user-1', authEpoch: 2 })).toBe(true);
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('expired:2');

    await act(async () => {
      authListener('SIGNED_IN', older);
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('expired:2');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: null,
      userId: null,
      authEpoch: 2,
      error: expect.any(Error),
    });

    await act(async () => {
      authListener('TOKEN_REFRESHED', refreshed);
    });
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:3');
    await expect(latestAuth.requireActiveSession()).resolves.toMatchObject({
      session: refreshed,
      userId: 'user-1',
      authEpoch: 3,
      error: null,
    });
  });

  it('expires readiness on the wall-clock deadline and ignores the replaced timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'));
    try {
      flag.value = true;
      const initial = {
        access_token: 'initial-token',
        user: { id: 'user-1' },
        expires_at: Math.floor(Date.now() / 1000) + 1,
      };
      const refreshed = {
        access_token: 'refreshed-token',
        user: { id: 'user-1' },
        expires_at: Math.floor(Date.now() / 1000) + 10,
      };
      getSessionMock.mockResolvedValue({ session: initial, error: null });
      profileMaybeSingle.mockResolvedValue({ data: { role: 'Admin' }, error: null });
      sessionExpiredMock.mockImplementation(
        (session) => Date.now() >= Number(session?.expires_at) * 1000
      );

      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');

      await act(async () => {
        authListener('TOKEN_REFRESHED', refreshed);
      });
      await act(async () => {
        vi.advanceTimersByTime(1_500);
      });
      expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');

      await act(async () => {
        vi.advanceTimersByTime(8_500);
      });
      expect(screen.getByTestId('readiness')).toHaveTextContent('expired:1');
    } finally {
      vi.useRealTimers();
    }
  });
});
