/**
 * Login throttle / account-lockout — pure, framework-agnostic helpers that the
 * sign-in flow routes through so that repeated failed credential checks against
 * a single email are (a) counted, (b) blocked for a cooldown once a threshold
 * is crossed, and (c) recorded in the existing audit log. The React glue lives
 * in `AuthContext.login()` and `pages/Login.jsx`; this module holds the pure
 * logic so it can be unit-tested in isolation (mirrors the `exportGuard.js`
 * pattern — logic separated from React).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HONEST FRAMING — READ THIS (mirrors authUsers.js / exportGuard.js):
 * Propela Ops is a front-end-only app with NO backend. Everything — the hashed
 * credentials AND this throttle state — lives in the browser. A determined
 * attacker can therefore read the bundled password hashes directly or simply
 * clear `localStorage` to wipe the throttle counters, so this control is
 * TRIVIALLY BYPASSABLE and is NOT a real brute-force / online-guessing defense.
 * It is included as (1) defense-in-depth against casual/opportunistic guessing
 * and (2) the correct UX + the exact pattern that MUST be re-implemented and
 * ENFORCED SERVER-SIDE (per-account AND per-IP, with a real client IP) the
 * moment a backend is introduced. Do not overstate what it buys us.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * All time is injected (`now` is passed in) so the logic is deterministic and
 * unit-testable — nothing here reads the clock or touches storage/React.
 *
 * State shape (persisted by storage.getLoginThrottle/saveLoginThrottle under the
 * `propela_ops_loginThrottle` key) is a plain map keyed by normalized email:
 *
 *   {
 *     "user@example.com": {
 *       failures: number,        // consecutive failed attempts in the streak
 *       firstFailureAt: number,  // epoch ms of the first failure in the streak
 *       lastFailureAt: number,   // epoch ms of the most recent failure
 *       lockedUntil: number|null // epoch ms the lock expires, or null
 *     }
 *   }
 *
 * Only counters + timestamps are stored — never the password or any hash.
 *
 * KEY CHOICE (documented per the task): the map is keyed by the NORMALIZED email
 * (lowercase + trimmed — the SAME normalization as findAuthUserByEmail), in
 * plaintext. Hashing the key was considered and intentionally NOT done: it would
 * force this pure module to become async (Web Crypto), breaking deterministic
 * testing, and it buys nothing here — the app is client-only, the emails are
 * non-secret (the audit log and the seeded data already store user identities in
 * the same localStorage), and an attacker with the bundle already has the
 * account list. If/when this moves server-side, the key can be an opaque account
 * id and the values live in a real datastore.
 */

import { CLIENT_IP, generateAuditId } from './exportGuard';

/* ──────────────────────────── Policy constants ─────────────────────────────
 * Named so a change to any threshold is a one-line edit and the tests can
 * assert against them (a regression to the numbers fails the suite).
 */

/** Lock an email after this many CONSECUTIVE failed attempts. */
export const MAX_FAILED_ATTEMPTS = 5;

/** How long a lock lasts once triggered (the cooldown). 15 minutes. */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Audit `action` values written for authentication attempts. */
export const LOGIN_FAILED_ACTION = 'LOGIN_FAILED';
export const LOGIN_LOCKED_OUT_ACTION = 'LOGIN_LOCKED_OUT';
export const LOGIN_SUCCESS_ACTION = 'LOGIN_SUCCESS';

/** A zeroed entry — used when an email has no recorded history. */
function emptyEntry() {
  return { failures: 0, firstFailureAt: null, lastFailureAt: null, lockedUntil: null };
}

/**
 * Normalize an email exactly like findAuthUserByEmail (lowercase + trim) so the
 * throttle keys line up with the credential lookup and there is no way to dodge
 * the counter with casing/whitespace variants.
 *
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Read the (defensive copy of the) entry for an email from the state map.
 * Always returns a well-formed entry, even for unknown emails — this is what
 * preserves no-enumeration parity: unknown and known emails share one code path.
 *
 * @param {Record<string, object>|null|undefined} state
 * @param {string} email
 * @returns {{failures:number, firstFailureAt:number|null, lastFailureAt:number|null, lockedUntil:number|null}}
 */
export function getEntry(state, email) {
  const key = normalizeEmail(email);
  const existing = state && typeof state === 'object' ? state[key] : null;
  if (!existing || typeof existing !== 'object') return emptyEntry();
  return {
    failures: Number(existing.failures) || 0,
    firstFailureAt: existing.firstFailureAt ?? null,
    lastFailureAt: existing.lastFailureAt ?? null,
    lockedUntil: existing.lockedUntil ?? null,
  };
}

/**
 * Milliseconds remaining on an active lock for `email`, or 0 if not locked /
 * the lock has expired.
 *
 * @param {Record<string, object>} state
 * @param {string} email
 * @param {number} now - epoch ms (injected)
 * @returns {number}
 */
export function remainingLockMs(state, email, now) {
  const { lockedUntil } = getEntry(state, email);
  if (typeof lockedUntil !== 'number') return 0;
  const remaining = lockedUntil - now;
  return remaining > 0 ? remaining : 0;
}

/**
 * Convert a remaining-ms value to a whole number of minutes for user-facing
 * messaging, always rounding UP and never below 1 (so "0 minutes" is never
 * shown while a lock is still active).
 *
 * @param {number} ms
 * @returns {number}
 */
export function remainingLockMinutes(ms) {
  if (!ms || ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 60000));
}

/**
 * Decide whether an attempt for `email` is currently allowed.
 *
 * Applied IDENTICALLY for every email (unknown or known) — the caller must call
 * this BEFORE looking the user up / hashing, so an attacker cannot tell a
 * locked-but-unknown email apart from a locked-and-real one.
 *
 * @param {Record<string, object>} state
 * @param {string} email
 * @param {number} now - epoch ms (injected)
 * @returns {{allowed:boolean, lockedUntil:number|null, remainingMs:number, remainingMinutes:number, failures:number}}
 */
export function evaluateAttempt(state, email, now) {
  const entry = getEntry(state, email);
  const remainingMs = remainingLockMs(state, email, now);
  const locked = remainingMs > 0;
  return {
    allowed: !locked,
    lockedUntil: locked ? entry.lockedUntil : null,
    remainingMs,
    remainingMinutes: remainingLockMinutes(remainingMs),
    failures: entry.failures,
  };
}

/**
 * Produce the NEXT state after a failed credential check for `email`.
 *
 * - If a previous lock has already fully expired, the streak starts fresh (the
 *   cooldown "forgives" the old failures), so a post-cooldown mistake does not
 *   instantly re-lock.
 * - The counter increments; once it reaches MAX_FAILED_ATTEMPTS the entry is
 *   locked for LOCKOUT_DURATION_MS from `now`.
 *
 * Pure: returns a new state object and never mutates the input.
 *
 * @param {Record<string, object>} state
 * @param {string} email
 * @param {number} now - epoch ms (injected)
 * @returns {Record<string, object>}
 */
export function recordFailure(state, email, now) {
  const key = normalizeEmail(email);
  const base = state && typeof state === 'object' ? state : {};
  let entry = getEntry(base, email);

  // A fully-expired lock forgives the prior streak.
  if (typeof entry.lockedUntil === 'number' && entry.lockedUntil <= now) {
    entry = emptyEntry();
  }

  const failures = entry.failures + 1;
  const nextEntry = {
    failures,
    firstFailureAt: entry.firstFailureAt ?? now,
    lastFailureAt: now,
    lockedUntil: failures >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null,
  };

  return { ...base, [key]: nextEntry };
}

/**
 * Produce the NEXT state after a SUCCESSFUL sign-in for `email`: the email's
 * entry is removed entirely, clearing the failure counter and any lock.
 *
 * Pure: returns a new state object and never mutates the input.
 *
 * @param {Record<string, object>} state
 * @param {string} email
 * @returns {Record<string, object>}
 */
export function recordSuccess(state, email) {
  const key = normalizeEmail(email);
  if (!state || typeof state !== 'object' || !(key in state)) {
    return state && typeof state === 'object' ? { ...state } : {};
  }
  const next = { ...state };
  delete next[key];
  return next;
}

/**
 * Drop entries whose lock has expired AND that carry no useful counter, keeping
 * the persisted map from growing unbounded. Purely optional housekeeping; the
 * decision logic does not depend on it. Pure — returns a new object.
 *
 * @param {Record<string, object>} state
 * @param {number} now - epoch ms (injected)
 * @returns {Record<string, object>}
 */
export function pruneExpired(state, now) {
  if (!state || typeof state !== 'object') return {};
  const next = {};
  for (const [key, value] of Object.entries(state)) {
    const entry = getEntry({ [key]: value }, key);
    const hasLock = typeof entry.lockedUntil === 'number';
    const lockActive = hasLock && entry.lockedUntil > now;
    const lockExpired = hasLock && entry.lockedUntil <= now;
    // An expired lock is stale — its streak will be forgiven on the next
    // failure anyway (see recordFailure), so drop it entirely.
    if (lockExpired) continue;
    // Keep still-active locks and in-progress streaks (so a partial streak is
    // never silently forgotten by housekeeping).
    if (lockActive || entry.failures > 0) {
      next[key] = value;
    }
  }
  return next;
}

/**
 * Build an audit-log entry for an authentication attempt, matching the existing
 * audit entry shape used across the app:
 *   { id, timestamp, user, action, entityType, entityId, ipAddress, details, severity }
 *
 * NEVER include the password or any hash. The attempted email is recorded as the
 * `user` (it is what identifies the attempt) and echoed for known/unknown alike
 * so the audit trail does not become an enumeration oracle either.
 *
 * @param {object} args
 * @param {'failed'|'locked'|'success'} args.outcome
 * @param {string} args.email - the ATTEMPTED email (already-known-or-not; not a secret)
 * @param {number} [args.failures] - current consecutive-failure count (for details)
 * @param {number} [args.remainingMinutes] - minutes left on the lock (locked outcome)
 * @param {number} [args.now] - epoch ms for the timestamp (defaults to Date.now())
 * @returns {{id:string,timestamp:string,user:string,action:string,entityType:string,entityId:string,ipAddress:string,details:string,severity:string}}
 */
export function buildLoginAuditEntry({ outcome, email, failures, remainingMinutes, now }) {
  const attempted = normalizeEmail(email) || '(empty)';
  const ts = typeof now === 'number' ? new Date(now).toISOString() : new Date().toISOString();

  let action;
  let severity;
  let details;
  switch (outcome) {
    case 'locked':
      action = LOGIN_LOCKED_OUT_ACTION;
      severity = 'critical';
      details = `Sign-in blocked — account temporarily locked after ${MAX_FAILED_ATTEMPTS} failed attempts; ${remainingMinutes ?? remainingLockMinutes(LOCKOUT_DURATION_MS)} minute(s) remaining`;
      break;
    case 'success':
      action = LOGIN_SUCCESS_ACTION;
      severity = 'info';
      details = 'Successful sign-in';
      break;
    case 'failed':
    default:
      action = LOGIN_FAILED_ACTION;
      severity = 'warning';
      details =
        typeof failures === 'number'
          ? `Failed sign-in attempt (${failures} of ${MAX_FAILED_ATTEMPTS} before lockout)`
          : 'Failed sign-in attempt';
      break;
  }

  return {
    id: generateAuditId(),
    timestamp: ts,
    user: attempted,
    action,
    entityType: 'auth',
    entityId: 'login',
    ipAddress: CLIENT_IP,
    details,
    severity,
  };
}
