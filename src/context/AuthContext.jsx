/**
 * Authentication context for Propela Ops.
 *
 * Provides the currently authenticated user plus login/logout actions. The
 * session is held in-memory (source of truth) with a sessionStorage mirror
 * (Fix #9 — see src/lib/sessionStore.js), so a page refresh within the SAME TAB
 * keeps the user signed in, while opening a new tab or reopening after the tab
 * is closed now requires re-login. This is an intentional, security-positive
 * change: the identity token is no longer persisted in localStorage (shared
 * across tabs, survives browser close), which shrinks the XSS token-theft blast
 * radius. AuthContext itself is unchanged by this — it still seeds from
 * getAuthSession() and calls saveAuthSession()/clearAuthSession(); only where
 * those helpers store the session moved. Permissions are NOT computed here —
 * they are derived from the live settings in AppContext via the usePermissions()
 * hook, so the stored user only needs to carry its identity and role.
 *
 * `useAuth()` is intentionally resilient: when called outside an AuthProvider
 * (e.g. in isolated component tests) it returns a safe, signed-out default
 * instead of throwing.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

const SIGNED_OUT_DEFAULT = {
  currentUser: null,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'Authentication is not available.' }),
  logout: () => {},
  getLockStatus: readLockStatus,
};

export function AuthProvider({ children }) {
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
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      getLockStatus: readLockStatus,
    }),
    [currentUser, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Resilient fallback for usage outside a provider (e.g. isolated tests).
    return SIGNED_OUT_DEFAULT;
  }
  return context;
}

export default AuthContext;
