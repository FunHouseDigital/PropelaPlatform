/**
 * Authentication context + `useAuth()` hook (Task 8.2).
 *
 * Exposes `{ user, role, session, loading, error, enabled, signIn, signOut }`
 * to the app. On mount (only when the `SUPABASE_BACKEND` flag is ON) it hydrates
 * the current session via {@link getSession}, subscribes to auth state changes,
 * and looks up the authenticated user's role from the `profiles` table for UI
 * gating only — the authoritative authorization decision always lives in
 * Postgres RLS (Req 3.3, 4.1, 4.2). A user with no `profiles` row resolves to a
 * `null` role.
 *
 * Phased-rollout safety (Req 9.1): while the flag is OFF (the legacy
 * `localStorage` default) the provider short-circuits to an inert "auth not
 * required" state — it never calls Supabase, never sets a loading state, and
 * simply renders its children so the legacy path is completely unaffected.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as auth from '../lib/auth';
import { isFeatureEnabled } from '../lib/featureFlags';
import { getSupabaseClient } from '../lib/supabaseClient';

/** Inert context value used on the legacy path and outside any provider. */
const INERT_VALUE = Object.freeze({
  user: null,
  role: null,
  session: null,
  loading: false,
  error: null,
  enabled: false,
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
});

const AuthContext = createContext(INERT_VALUE);

/**
 * Provider that manages the Supabase auth session and derived role.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const enabled = isFeatureEnabled('SUPABASE_BACKEND');

  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  // Only start in a loading state when the backend is active and we must
  // hydrate the session; the legacy path is never "loading".
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  /**
   * Look up the caller's role from `profiles` for UI gating. No profile row ⇒
   * role null (Req 4.2, 4.7). Failures degrade gracefully to a null role rather
   * than throwing; RLS remains the authoritative gate regardless.
   */
  const fetchRole = useCallback(async (activeSession) => {
    const userId = activeSession?.user?.id;
    if (!userId) {
      setRole(null);
      return;
    }
    try {
      const client = getSupabaseClient();
      const { data, error: roleError } = await client
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      setRole(roleError ? null : (data?.role ?? null));
    } catch {
      setRole(null);
    }
  }, []);

  // Hydrate session + subscribe to auth changes (only when the backend is ON).
  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;

    (async () => {
      const { session: current, error: sessionError } = await auth.getSession();
      if (!active) return;
      if (sessionError) setError(sessionError);
      setSession(current);
      await fetchRole(current);
      if (active) setLoading(false);
    })();

    let subscription;
    try {
      const { data } = auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        fetchRole(nextSession);
      });
      subscription = data?.subscription;
    } catch {
      // If subscription cannot be established, session hydration above still
      // drives the initial state; nothing else to do here.
    }

    return () => {
      active = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [enabled, fetchRole]);

  const signIn = useCallback(
    async (email, password) => {
      setError(null);
      const { data, error: signInError } = await auth.signIn(email, password);
      if (signInError) {
        setError(signInError);
        return { data: null, error: signInError };
      }
      // Update eagerly; the onAuthStateChange subscription will also fire.
      if (data?.session) {
        setSession(data.session);
        await fetchRole(data.session);
      }
      return { data, error: null };
    },
    [fetchRole],
  );

  const signOut = useCallback(async () => {
    const result = await auth.signOut();
    // Clear local auth state regardless of the network result so the UI never
    // shows a stale authenticated state after logout (Req 3.8).
    setSession(null);
    setRole(null);
    setError(null);
    return result;
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      role,
      session,
      loading: enabled ? loading : false,
      error,
      enabled,
      signIn,
      signOut,
    }),
    [session, role, enabled, loading, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the auth context. Returns an inert "not required" value when used
 * outside a provider so consumers on the legacy path stay import-safe.
 *
 * @returns {typeof INERT_VALUE}
 */
export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
