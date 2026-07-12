/**
 * Authentication module (Task 8.1).
 *
 * Thin, import-safe wrapper over the `supabase-js` auth surface used by the
 * frontend to sign in, sign out, and inspect the current session (Req 3.2,
 * 3.6, 3.7, 3.8, 3.9). It never manages tokens directly: `supabase-js` persists
 * the session and automatically attaches the session's Bearer JWT to every
 * PostgREST request (Req 3.7). The privileged service_role key is NEVER
 * referenced here (Req 7.2, 10.x) — only the public, RLS-constrained client.
 *
 * Import-safety: the Supabase client is obtained lazily through the memoized
 * `getSupabaseClient()` factory, so merely importing this module never
 * instantiates the client or touches the network. That keeps the legacy
 * `localStorage` path unaffected while the `SUPABASE_BACKEND` flag is OFF.
 *
 * Every function returns a normalized result envelope (`{ ..., error }`) rather
 * than throwing across the async boundary, and each network call is wrapped in
 * a 5-second timeout (Req 3.2, 3.6). On timeout or unavailability the caller
 * receives a NETWORK {@link DataError} so the login screen can distinguish
 * "authentication temporarily unavailable" from "invalid credentials" (Req 3.6).
 */

import { DataError, DataErrorCode, mapError } from './dataLayer/errors';
import { withTimeout } from './dataLayer/supabaseAdapter';
import { getSupabaseClient } from './supabaseClient';

/** Auth network timeout in milliseconds (Req 3.2, 3.6). */
export const AUTH_TIMEOUT_MS = 5_000;

/** User-safe message when the auth service times out or is unreachable. */
const UNAVAILABLE_MESSAGE =
  'Authentication is temporarily unavailable. Please try again.';

/** Generic invalid-credential message — does NOT disclose which field (Req 3.4). */
const INVALID_CREDENTIALS_MESSAGE =
  'Invalid credentials. Please check your details and try again.';

/**
 * Classify a driver error as an availability failure (timeout / network / 5xx)
 * versus a credential rejection. Availability failures surface as NETWORK so the
 * UI shows the temporarily-unavailable message and preserves the input (Req 3.6);
 * everything else is treated as a generic credential failure (Req 3.4).
 *
 * @param {unknown} error
 * @returns {boolean} true when the failure indicates the service is unavailable.
 */
function isUnavailable(error) {
  const status =
    error && typeof error === 'object'
      ? (error.status ?? error.statusCode ?? error.httpStatus)
      : undefined;
  if (typeof status === 'number' && status >= 500) return true;
  return mapError(error).code === DataErrorCode.NETWORK;
}

/**
 * Normalize any failure into an auth-facing {@link DataError}: NETWORK (with the
 * unavailable message) when the service is unreachable/slow, otherwise AUTH with
 * the generic invalid-credentials message.
 *
 * @param {unknown} error
 * @returns {DataError}
 */
function normalizeAuthError(error) {
  if (isUnavailable(error)) {
    return new DataError(DataErrorCode.NETWORK, UNAVAILABLE_MESSAGE, error);
  }
  return new DataError(DataErrorCode.AUTH, INVALID_CREDENTIALS_MESSAGE, error);
}

/**
 * Sign in with an email + password against Supabase Auth (Req 3.2).
 *
 * The call is bounded by a 5-second timeout; a timeout or unreachable service
 * yields a NETWORK error carrying the unavailable message (Req 3.6), while a
 * credential rejection yields a generic AUTH error that never reveals whether
 * the email or the password was wrong (Req 3.4).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: { session: object|null, user: object|null }|null, error: DataError|null }>}
 */
export async function signIn(email, password) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await withTimeout(
      client.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
    );
    if (error) return { data: null, error: normalizeAuthError(error) };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeAuthError(err) };
  }
}

/**
 * End the current session and remove all session tokens from the browser
 * (Req 3.8). `supabase-js` clears its persisted session from storage as part of
 * `signOut()`. Bounded by the same 5-second timeout.
 *
 * @returns {Promise<{ error: DataError|null }>}
 */
export async function signOut() {
  try {
    const client = getSupabaseClient();
    const { error } = await withTimeout(client.auth.signOut(), AUTH_TIMEOUT_MS);
    if (error) return { error: mapError(error) };
    return { error: null };
  } catch (err) {
    return { error: mapError(err) };
  }
}

/**
 * Return the current session, or null when there is none (Req 3.3, 3.9).
 *
 * @returns {Promise<{ session: object|null, error: DataError|null }>}
 */
export async function getSession() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await withTimeout(
      client.auth.getSession(),
      AUTH_TIMEOUT_MS,
    );
    if (error) return { session: null, error: mapError(error) };
    return { session: data?.session ?? null, error: null };
  } catch (err) {
    return { session: null, error: mapError(err) };
  }
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh). A
 * passthrough over `supabase-js` `onAuthStateChange` returning the same
 * `{ data: { subscription } }` shape so callers can `unsubscribe()`.
 *
 * @param {(event: string, session: object|null) => void} callback
 * @returns {{ data: { subscription: { unsubscribe: () => void } } }}
 */
export function onAuthStateChange(callback) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Return the current session's access token, or null when unauthenticated.
 * Callers rarely need this because `supabase-js` attaches the token
 * automatically (Req 3.7); it is exposed for diagnostics and tests.
 *
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const { session } = await getSession();
  return session?.access_token ?? null;
}

/**
 * Determine whether a session has reached its expiration (Req 3.9). A missing
 * session is treated as expired. Supabase sessions carry `expires_at` in epoch
 * seconds; when absent the session is treated as not-expired (the auth client
 * refreshes tokens on its own schedule).
 *
 * @param {object|null} session
 * @returns {boolean}
 */
export function isSessionExpired(session) {
  if (!session) return true;
  const expiresAt = session.expires_at;
  if (typeof expiresAt !== 'number') return false;
  return Date.now() >= expiresAt * 1000;
}

export default {
  AUTH_TIMEOUT_MS,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  getAccessToken,
  isSessionExpired,
};
