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
  useRef,
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
const SIGNED_OUT_READINESS = Object.freeze({
  status: 'signedOut',
  session: null,
  userId: null,
  authEpoch: 0,
});

const inactiveSessionResult = async () => ({
  session: null,
  userId: null,
  authEpoch: 0,
  error: new Error('Authentication required.'),
});

const inactiveSessionInvalidation = () => false;
const getSignedOutReadiness = () => SIGNED_OUT_READINESS;

function sessionsMatch(left, right) {
  if (left === right) return true;
  const leftToken = left?.access_token;
  const rightToken = right?.access_token;
  return (
    typeof leftToken === 'string' &&
    leftToken.length > 0 &&
    typeof rightToken === 'string' &&
    leftToken === rightToken
  );
}

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
  readiness: SIGNED_OUT_READINESS,
  requireActiveSession: inactiveSessionResult,
  getReadinessSnapshot: getSignedOutReadiness,
  invalidateSession: inactiveSessionInvalidation,
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
      readiness: SIGNED_OUT_READINESS,
      requireActiveSession: inactiveSessionResult,
      getReadinessSnapshot: getSignedOutReadiness,
      invalidateSession: inactiveSessionInvalidation,
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
  const enabled = true;
  const initialReadiness = Object.freeze({
    status: 'initializing',
    session: null,
    userId: null,
    authEpoch: 0,
  });
  const [readiness, setReadiness] = useState(initialReadiness);
  const readinessRef = useRef(initialReadiness);
  const pendingReadinessRef = useRef(null);
  const explicitSignInRef = useRef(false);
  const signInAttemptRef = useRef(0);
  // Server-invalidated boundaries are principal-scoped. Keeping only one global
  // marker would let an explicit sign-in by B erase A's rejection boundary,
  // allowing a delayed ordinary SIGNED_IN(A) callback to replace B.
  // Values contain identity/epoch metadata only; no session credentials.
  const invalidatedBoundariesRef = useRef(new Map());
  const expiryDeadlineRef = useRef({ generation: 0, timer: null });
  const roleRequestRef = useRef(0);
  const [role, setRole] = useState(null);
  const [roleUserId, setRoleUserId] = useState(null);
  const [error, setError] = useState(null);

  const commitSession = useCallback((nextSession, source = 'event') => {
    const previous = readinessRef.current;
    const userId = nextSession?.user?.id;
    const hasUser = typeof userId === 'string' && userId.trim().length > 0;
    const expired = !!nextSession && supabaseAuth.isSessionExpired(nextSession);
    const status = !nextSession ? 'signedOut' : !hasUser || expired ? 'expired' : 'active';
    const previousUserId = previous.session?.user?.id ?? previous.userId;
    const duplicateSession =
      previousUserId === userId && sessionsMatch(previous.session, nextSession);
    const invalidated = invalidatedBoundariesRef.current.get(userId);
    const isInvalidatedSignInEvent =
      status === 'active' && source === 'event' && invalidated !== undefined;

    // Once the server rejects an epoch, no ordinary SIGNED_IN callback may
    // reopen that same principal. Callback tokens can differ because delayed
    // events from older sessions are still not proof of recovery. Only a newer
    // successful explicit sign-in or TOKEN_REFRESHED event may recover it.
    // Return null so callback-side work cannot treat the retained snapshot as
    // acceptance of the rejected session.
    if (isInvalidatedSignInEvent) return null;

    const principalChanged = previous.userId !== (status === 'active' ? userId : null);
    if (principalChanged) {
      roleRequestRef.current += 1;
      setRole(null);
      setRoleUserId(null);
    }
    let authEpoch = previous.authEpoch;

    if (status === 'active') {
      const sameActivePrincipal = previous.status === 'active' && previous.userId === userId;
      const recoveringFromInvalidation =
        invalidated?.userId === userId && invalidated?.authEpoch === previous.authEpoch;
      if (
        source === 'explicitSignIn' ||
        (source === 'refresh' && recoveringFromInvalidation) ||
        (!sameActivePrincipal && !duplicateSession)
      ) {
        authEpoch += 1;
      }
      if (source === 'explicitSignIn' || source === 'refresh') {
        invalidatedBoundariesRef.current.delete(userId);
      }
    }

    const next = Object.freeze({
      status,
      session: status === 'signedOut' ? null : nextSession,
      userId: status === 'active' ? userId : null,
      authEpoch,
    });
    readinessRef.current = next;
    setReadiness(next);
    return next;
  }, []);

  const invalidateSession = useCallback(({ userId, authEpoch } = {}) => {
    const current = readinessRef.current;
    if (
      current.status !== 'active' ||
      current.userId !== userId ||
      current.authEpoch !== authEpoch
    ) {
      return false;
    }

    invalidatedBoundariesRef.current.set(userId, { userId, authEpoch });
    roleRequestRef.current += 1;
    setRole(null);
    setRoleUserId(null);
    const expired = Object.freeze({
      status: 'expired',
      session: current.session,
      userId: null,
      authEpoch: current.authEpoch,
    });
    readinessRef.current = expired;
    setReadiness(expired);
    return true;
  }, []);

  const expireSessionBoundary = useCallback(({ userId, authEpoch, session }) => {
    const current = readinessRef.current;
    if (
      current.status !== 'active' ||
      current.userId !== userId ||
      current.authEpoch !== authEpoch ||
      current.session !== session
    ) {
      return false;
    }
    roleRequestRef.current += 1;
    setRole(null);
    setRoleUserId(null);
    const expired = Object.freeze({
      status: 'expired',
      session: current.session,
      userId: null,
      authEpoch: current.authEpoch,
    });
    readinessRef.current = expired;
    setReadiness(expired);
    return true;
  }, []);

  const fetchRole = useCallback(async (activeSession) => {
    const request = roleRequestRef.current + 1;
    roleRequestRef.current = request;
    const userId = activeSession?.user?.id;
    if (!userId) {
      setRole(null);
      setRoleUserId(null);
      return;
    }
    try {
      const client = getSupabaseClient();
      const { data, error: roleError } = await client
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (roleRequestRef.current === request) {
        setRole(roleError ? null : (data?.role ?? null));
        setRoleUserId(userId);
      }
    } catch {
      if (roleRequestRef.current === request) {
        setRole(null);
        setRoleUserId(userId);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydration = (async () => {
      const { session: current, error: sessionError } = await supabaseAuth.getSession();
      if (!active) return;
      if (sessionError) setError(sessionError);
      if (readinessRef.current.status === 'initializing') {
        commitSession(current, 'hydration');
        await fetchRole(current);
      }
    })();
    pendingReadinessRef.current = hydration;
    hydration.finally(() => {
      if (pendingReadinessRef.current === hydration) pendingReadinessRef.current = null;
    });

    let subscription;
    try {
      const { data } = supabaseAuth.onAuthStateChange((event, nextSession) => {
        if (event === 'SIGNED_IN') {
          if (explicitSignInRef.current) return;
          const current = readinessRef.current;
          const callbackUserId = nextSession?.user?.id;
          // Supabase can deliver the SIGNED_IN callback after the explicit
          // promise. Once an explicit same-user session is active, only its
          // duplicate callback or TOKEN_REFRESHED may update that boundary;
          // an older same-user callback must not roll the gateway backward.
          if (
            current.status === 'active' &&
            current.userId === callbackUserId &&
            !sessionsMatch(current.session, nextSession)
          ) {
            return;
          }
        }
        const acceptedReadiness = commitSession(
          nextSession,
          event === 'TOKEN_REFRESHED' ? 'refresh' : 'event'
        );
        const callbackUserId = nextSession?.user?.id;
        if (
          acceptedReadiness?.status === 'active' &&
          acceptedReadiness.userId === callbackUserId &&
          sessionsMatch(acceptedReadiness.session, nextSession)
        ) {
          fetchRole(acceptedReadiness.session);
        }
      });
      subscription = data?.subscription;
    } catch {
      // Initial provider-owned hydration remains authoritative without a listener.
    }

    return () => {
      active = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [commitSession, fetchRole]);

  useEffect(() => {
    const deadline = expiryDeadlineRef.current;
    deadline.generation += 1;
    const generation = deadline.generation;
    if (deadline.timer !== null) {
      clearTimeout(deadline.timer);
      deadline.timer = null;
    }

    if (readiness.status !== 'active') return undefined;
    const expiresAt = readiness.session?.expires_at;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return undefined;

    const boundary = {
      userId: readiness.userId,
      authEpoch: readiness.authEpoch,
      session: readiness.session,
    };
    const expire = () => {
      if (expiryDeadlineRef.current.generation !== generation) return;
      const remaining = expiresAt * 1000 - Date.now();
      if (remaining > 0) {
        expiryDeadlineRef.current.timer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
        return;
      }
      expiryDeadlineRef.current.timer = null;
      expireSessionBoundary(boundary);
    };
    expire();

    return () => {
      if (expiryDeadlineRef.current.generation !== generation) return;
      expiryDeadlineRef.current.generation += 1;
      if (expiryDeadlineRef.current.timer !== null) {
        clearTimeout(expiryDeadlineRef.current.timer);
        expiryDeadlineRef.current.timer = null;
      }
    };
  }, [expireSessionBoundary, readiness]);

  const signIn = useCallback(
    async (email, password) => {
      setError(null);
      const attempt = signInAttemptRef.current + 1;
      signInAttemptRef.current = attempt;
      explicitSignInRef.current = true;
      const operation = (async () => {
        const { data, error: signInError } = await supabaseAuth.signIn(email, password);
        if (attempt !== signInAttemptRef.current) return { data, error: signInError ?? null };
        if (signInError) {
          setError(signInError);
          return { data: null, error: signInError };
        }
        if (data?.session) {
          commitSession(data.session, 'explicitSignIn');
          await fetchRole(data.session);
        }
        return { data, error: null };
      })();
      pendingReadinessRef.current = operation;
      try {
        return await operation;
      } finally {
        if (attempt === signInAttemptRef.current) {
          explicitSignInRef.current = false;
          if (pendingReadinessRef.current === operation) pendingReadinessRef.current = null;
        }
      }
    },
    [commitSession, fetchRole]
  );

  const requireActiveSession = useCallback(async () => {
    const pending = pendingReadinessRef.current;
    if (readinessRef.current.status === 'initializing' || explicitSignInRef.current) {
      try {
        await pending;
      } catch {
        // The normalized readiness result below fails closed.
      }
    }

    let snapshot = readinessRef.current;
    if (snapshot.status === 'active' && supabaseAuth.isSessionExpired(snapshot.session)) {
      expireSessionBoundary({
        userId: snapshot.userId,
        authEpoch: snapshot.authEpoch,
        session: snapshot.session,
      });
      snapshot = readinessRef.current;
    }
    if (snapshot.status !== 'active' || !snapshot.userId) {
      return {
        session: null,
        userId: null,
        authEpoch: snapshot.authEpoch,
        error: new Error('Authentication required.'),
      };
    }
    return {
      session: snapshot.session,
      userId: snapshot.userId,
      authEpoch: snapshot.authEpoch,
      error: null,
    };
  }, [expireSessionBoundary]);

  const signOut = useCallback(async () => {
    const result = await supabaseAuth.signOut();
    commitSession(null, 'signOut');
    roleRequestRef.current += 1;
    setRole(null);
    setRoleUserId(null);
    setError(null);
    return result;
  }, [commitSession]);

  const session = readiness.session;
  const loading = readiness.status === 'initializing';
  const effectiveRole = roleUserId === readiness.userId ? role : null;
  const currentUser = useMemo(() => {
    const u = session?.user;
    if (!u || readiness.status !== 'active') return null;
    return {
      id: u.id,
      email: u.email ?? null,
      name: u.user_metadata?.name ?? u.email ?? 'User',
      role: effectiveRole,
    };
  }, [effectiveRole, readiness.status, session]);

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

  const getReadinessSnapshot = useCallback(() => readinessRef.current, []);

  const value = useMemo(
    () => ({
      user: readiness.status === 'active' ? (session?.user ?? null) : null,
      role: effectiveRole,
      session,
      loading,
      readiness,
      requireActiveSession,
      getReadinessSnapshot,
      invalidateSession,
      error,
      enabled,
      signIn,
      signOut,
      currentUser,
      isAuthenticated: readiness.status === 'active',
      login,
      logout: signOut,
      getLockStatus: readLockStatus,
    }),
    [
      readiness,
      session,
      effectiveRole,
      loading,
      requireActiveSession,
      getReadinessSnapshot,
      invalidateSession,
      error,
      enabled,
      signIn,
      signOut,
      currentUser,
      login,
    ]
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
