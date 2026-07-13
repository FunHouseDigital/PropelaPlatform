/**
 * Authentication context for Propela Ops — FLAG-SWITCHED HYBRID.
 *
 * A single `AuthProvider` / `useAuth()` pair serves two auth systems and picks
 * one at runtime based on the `SUPABASE_BACKEND` feature flag:
 *
 *   • Flag OFF (the DEFAULT / live path) → hardened localStorage auth (PR #36):
 *     sha256-hashed credential check, rate-limit / account lockout (loginThrottle),
 *     login audit logging, and identity held in-memory + sessionStorage. It
 *     exposes the legacy contract the app consumers depend on:
 *     `currentUser`, `isAuthenticated`, `login`, `logout`, `getLockStatus`.
 *
 *   • Flag ON → Supabase auth (main): hydrates the session, subscribes to auth
 *     state changes, and derives the role from the `profiles` table for UI
 *     gating only (RLS is authoritative). It exposes the Supabase contract:
 *     `user`, `role`, `session`, `loading`, `error`, `enabled`, `signIn`,
 *     `signOut`.
 *
 * Both providers publish a SUPERSET context value so consumers from either group
 * resolve without crashing in either mode. In flag-ON mode the provider also
 * derives a sensible `currentUser` / `isAuthenticated` from the Supabase session
 * + role, and maps `login`/`logout` onto `signIn`/`signOut`, so the app's
 * primary (legacy-contract) consumers — Sidebar, useExport, usePermissions,
 * Forbidden, ProtectedRoute — keep working in BOTH modes. In flag-OFF mode the
 * Supabase-specific fields are null/inert.
 *
 * `useAuth()` is intentionally resilient: when called outside a provider (e.g.
 * in isolated component tests) it returns a safe, signed-out superset default
 * instead of throwing.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { findAuthUserByEmail, sha256Hex } from '../data/authUsers';
import {
  clearAuthSession,
  getAuditLog,
  getAuthSession,
  getLoginThrottle,
  saveAuditLog,
  saveAuthSession,
  saveLoginThrottle,
} from '../lib/storage';
import {
  buildLoginAuditEntry,
  evaluateAttempt,
  pruneExpired,
  recordFailure,
  recordSuccess,
} from '../lib/loginThrottle';
import * as supabaseAuth from '../lib/auth';
import { isFeatureEnabled } from '../lib/featureFlags';
import { getSupabaseClient } from '../lib/supabaseClient';

const AuthContext = createContext(null);

/** Generic error reused for every ordinary auth failure (no user enumeration). */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

/**
 * Build the user-facing lockout message. Kept generic-but-actionable — it does
 * NOT reveal whether the email is a real account (unknown + known-wrong-password
 * are throttled and messaged identically).
 * @param {number} minutes
 */
function lockoutMessage(minutes) {
  const m = Math.max(1, minutes || 1);
  return `Too many attempts. Try again in ${m} minute${m === 1 ? '' : 's'}.`;
}

/**
 * Append an audit entry to the persisted audit log (Fix #3 infrastructure).
 *
 * AuthContext is intentionally decoupled from AppContext, and the Login page can
 * render before/outside AppProvider, so we write straight to storage via the
 * existing getAuditLog/saveAuditLog helpers rather than AppContext.updateAuditLog.
 * The entry is persisted immediately; AppContext reads it into its in-memory
 * auditLog on the next load, so it surfaces in the Audit Trail UI without any new
 * wiring. Never logs a password or hash (see buildLoginAuditEntry).
 */
function appendAuditEntry(entry) {
  try {
    const current = getAuditLog();
    saveAuditLog([entry, ...(Array.isArray(current) ? current : [])]);
  } catch {
    // Auditing must never block or break the sign-in flow.
  }
}

/**
 * Read-only lock status for an email, used by the Login page to disable the
 * submit button + show a countdown before an attempt is even made. Safe for
 * unknown emails (returns allowed:true with a zeroed entry).
 * @param {string} email
 */
function readLockStatus(email) {
  try {
    const state = getLoginThrottle();
    return evaluateAttempt(state, email, Date.now());
  } catch {
    return { allowed: true, lockedUntil: null, remainingMs: 0, remainingMinutes: 0, failures: 0 };
  }
}

/**
 * Superset signed-out default returned by useAuth() when used outside a
 * provider. Carries BOTH the legacy contract and the Supabase contract so any
 * consumer stays import-safe regardless of which mode it expects.
 */
const SIGNED_OUT_DEFAULT = Object.freeze({
  // Legacy (hardened localStorage) contract
  currentUser: null,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'Authentication is not available.' }),
  logout: () => {},
  getLockStatus: readLockStatus,
  // Supabase contract
  user: null,
  role: null,
  session: null,
  loading: false,
  error: null,
  enabled: false,
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
});

/**
 * Flag-OFF provider: PR #36's hardened localStorage auth. Publishes the legacy
 * contract plus inert Supabase fields so Supabase-shaped consumers don't crash.
 */
function LegacyAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getAuthSession());

  const login = useCallback(async (email, password) => {
    const now = Date.now();

    // ── Throttle gate (Fix #8) ────────────────────────────────────────────
    // Check the lockout BEFORE looking the user up or hashing anything, so a
    // locked email short-circuits without a credential comparison. This runs
    // identically for unknown and known emails (no enumeration): the attempted
    // email is the only key, and we never branch on account existence here.
    //
    // HONEST CAVEAT (see loginThrottle.js): this state lives in localStorage in
    // a no-backend app, so it is bypassable and is defense-in-depth only — the
    // same control MUST be enforced server-side once a backend exists.
    const throttleState = getLoginThrottle();
    const gate = evaluateAttempt(throttleState, email, now);
    if (!gate.allowed) {
      appendAuditEntry(
        buildLoginAuditEntry({
          outcome: 'locked',
          email,
          remainingMinutes: gate.remainingMinutes,
          now,
        })
      );
      return {
        success: false,
        error: lockoutMessage(gate.remainingMinutes),
        locked: true,
        lockedUntil: gate.lockedUntil,
        remainingMs: gate.remainingMs,
      };
    }

    const user = findAuthUserByEmail(email);

    let hashed;
    if (user) {
      try {
        hashed = await sha256Hex(password ?? '');
      } catch {
        // Environment/crypto failure — NOT a credential failure, so do not count
        // it against the throttle.
        return { success: false, error: 'Unable to verify credentials in this environment.' };
      }
    }

    // Failure path: unknown email OR wrong password — treated identically.
    if (!user || hashed !== user.passwordHash) {
      const nextState = pruneExpired(recordFailure(throttleState, email, now), now);
      saveLoginThrottle(nextState);

      // Did this failure trip the lock? If so, surface the lockout message +
      // record a lockout event; otherwise keep the generic invalid-credentials
      // wording (still no enumeration).
      const after = evaluateAttempt(nextState, email, now);
      if (!after.allowed) {
        appendAuditEntry(
          buildLoginAuditEntry({
            outcome: 'locked',
            email,
            remainingMinutes: after.remainingMinutes,
            now,
          })
        );
        return {
          success: false,
          error: lockoutMessage(after.remainingMinutes),
          locked: true,
          lockedUntil: after.lockedUntil,
          remainingMs: after.remainingMs,
        };
      }

      appendAuditEntry(
        buildLoginAuditEntry({ outcome: 'failed', email, failures: after.failures, now })
      );
      return { success: false, error: INVALID_CREDENTIALS_MESSAGE };
    }

    // Success path: clear this email's throttle entry and audit the sign-in.
    const clearedState = pruneExpired(recordSuccess(throttleState, email), now);
    saveLoginThrottle(clearedState);
    appendAuditEntry(buildLoginAuditEntry({ outcome: 'success', email, now }));

    // Store only non-sensitive identity fields — never the password/hash.
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    setCurrentUser(sessionUser);
    saveAuthSession(sessionUser);
    return { success: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearAuthSession();
  }, []);

  const value = useMemo(
    () => ({
      // Legacy (live) contract
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      getLockStatus: readLockStatus,
      // Supabase contract — inert on the legacy path
      user: null,
      role: currentUser?.role ?? null,
      session: null,
      loading: false,
      error: null,
      enabled: false,
      signIn: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
    }),
    [currentUser, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Flag-ON provider: main's Supabase auth. Publishes the Supabase contract plus
 * a DERIVED legacy contract (currentUser/isAuthenticated/login/logout) so the
 * app's primary consumers keep working while the backend is active.
 *
 * On mount it hydrates the current session via {@link supabaseAuth.getSession},
 * subscribes to auth state changes, and looks up the user's role from the
 * `profiles` table for UI gating only — the authoritative authorization
 * decision always lives in Postgres RLS. A user with no `profiles` row resolves
 * to a `null` role.
 */
function SupabaseAuthProvider({ children }) {
  const enabled = true; // only rendered when the flag is ON

  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Look up the caller's role from `profiles` for UI gating. No profile row ⇒
   * role null. Failures degrade gracefully to a null role rather than throwing;
   * RLS remains the authoritative gate regardless.
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

  // Hydrate session + subscribe to auth changes.
  useEffect(() => {
    let active = true;

    (async () => {
      const { session: current, error: sessionError } = await supabaseAuth.getSession();
      if (!active) return;
      if (sessionError) setError(sessionError);
      setSession(current);
      await fetchRole(current);
      if (active) setLoading(false);
    })();

    let subscription;
    try {
      const { data } = supabaseAuth.onAuthStateChange((_event, nextSession) => {
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
  }, [fetchRole]);

  const signIn = useCallback(
    async (email, password) => {
      setError(null);
      const { data, error: signInError } = await supabaseAuth.signIn(email, password);
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
    [fetchRole]
  );

  const signOut = useCallback(async () => {
    const result = await supabaseAuth.signOut();
    // Clear local auth state regardless of the network result so the UI never
    // shows a stale authenticated state after logout.
    setSession(null);
    setRole(null);
    setError(null);
    return result;
  }, []);

  // Derived legacy identity so legacy-contract consumers keep working when the
  // Supabase backend is active.
  const currentUser = useMemo(() => {
    const u = session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email ?? null,
      name: u.user_metadata?.name ?? u.email ?? 'User',
      role: role ?? null,
    };
  }, [session, role]);

  // Legacy login() bridged onto signIn() so the shared Login flow / consumers
  // resolve identically in both modes.
  const login = useCallback(
    async (email, password) => {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        return { success: false, error: signInError.message || 'Unable to sign in.' };
      }
      return { success: true };
    },
    [signIn]
  );

  const value = useMemo(
    () => ({
      // Supabase contract
      user: session?.user ?? null,
      role,
      session,
      loading,
      error,
      enabled,
      signIn,
      signOut,
      // Derived legacy contract
      currentUser,
      isAuthenticated: !!session?.user,
      login,
      logout: signOut,
      getLockStatus: readLockStatus,
    }),
    [session, role, loading, error, enabled, signIn, signOut, currentUser, login]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Public provider. Picks the concrete auth implementation from the
 * `SUPABASE_BACKEND` feature flag at render time.
 */
export function AuthProvider({ children }) {
  const useSupabase = isFeatureEnabled('SUPABASE_BACKEND');
  return useSupabase ? (
    <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  ) : (
    <LegacyAuthProvider>{children}</LegacyAuthProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Resilient superset fallback for usage outside a provider (e.g. isolated tests).
    return SIGNED_OUT_DEFAULT;
  }
  return context;
}

export default AuthContext;
