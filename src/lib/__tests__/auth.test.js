/**
 * Unit tests for the auth module (Task 8.5).
 *
 * Covers: invalid-credential non-disclosure (Req 3.4), auth-unavailable/timeout
 * handling (Req 3.6), logout clearing tokens (Req 3.8), and session-expiry
 * detection that forces re-auth (Req 3.9). The Supabase client is mocked so no
 * network is touched.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
};

// Both auth.js and supabaseAdapter.js import getSupabaseClient from this module;
// mocking it here covers both (they resolve to the same module id).
vi.mock('../supabaseClient', () => ({
  getSupabaseClient: () => ({ auth: mockAuth }),
  resetSupabaseClient: () => {},
  default: () => ({ auth: mockAuth }),
}));

import { getSession, isSessionExpired, signIn, signOut } from '../auth';
import { DataErrorCode } from '../dataLayer/errors';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signIn', () => {
  it('returns a generic AUTH error that does not disclose which field was wrong (Req 3.4)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const result = await signIn('user@example.com', 'wrong-password');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe(DataErrorCode.AUTH);
    // Message must not reveal whether the email or the password was incorrect.
    expect(result.error.message).not.toMatch(/email/i);
    expect(result.error.message).not.toMatch(/password/i);
  });

  it('classifies a 5xx service failure as NETWORK / unavailable (Req 3.6)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Service Unavailable', status: 503 },
    });

    const result = await signIn('user@example.com', 'secret');

    expect(result.data).toBeNull();
    expect(result.error.code).toBe(DataErrorCode.NETWORK);
  });

  it('classifies a transport failure (thrown) as NETWORK / unavailable (Req 3.6)', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await signIn('user@example.com', 'secret');

    expect(result.error.code).toBe(DataErrorCode.NETWORK);
  });

  it('returns the session on success', async () => {
    const session = { access_token: 'jwt', user: { id: 'u1' } };
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session }, error: null });

    const result = await signIn('user@example.com', 'correct');

    expect(result.error).toBeNull();
    expect(result.data.session).toBe(session);
  });
});

describe('signOut', () => {
  it('delegates to the auth client so all session tokens are cleared (Req 3.8)', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });
});

describe('getSession', () => {
  it('returns null when there is no active session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const result = await getSession();

    expect(result.session).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('isSessionExpired (Req 3.9)', () => {
  it('treats a missing session as expired', () => {
    expect(isSessionExpired(null)).toBe(true);
  });

  it('treats a past expires_at as expired (forces re-auth)', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isSessionExpired({ expires_at: past })).toBe(true);
  });

  it('treats a future expires_at as active', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isSessionExpired({ expires_at: future })).toBe(false);
  });
});
