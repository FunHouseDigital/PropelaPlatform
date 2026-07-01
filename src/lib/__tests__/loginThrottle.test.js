import { describe, expect, it } from 'vitest';

import {
  LOCKOUT_DURATION_MS,
  LOGIN_FAILED_ACTION,
  LOGIN_LOCKED_OUT_ACTION,
  LOGIN_SUCCESS_ACTION,
  MAX_FAILED_ATTEMPTS,
  buildLoginAuditEntry,
  evaluateAttempt,
  getEntry,
  normalizeEmail,
  pruneExpired,
  recordFailure,
  recordSuccess,
  remainingLockMinutes,
  remainingLockMs,
} from '../loginThrottle';

// A fixed base timestamp so every test is deterministic (no real clock reads).
const T0 = 1_700_000_000_000; // arbitrary fixed epoch ms
const EMAIL = 'user@example.com';

/**
 * Drive `count` consecutive failures for `email` starting from `state`, one ms
 * apart, and return the resulting state. Deterministic via injected `now`.
 */
function failN(state, email, count, startNow = T0) {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = recordFailure(next, email, startNow + i);
  }
  return next;
}

describe('normalizeEmail — parity with findAuthUserByEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('returns empty string for non-strings', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(42)).toBe('');
  });
});

describe('policy constants', () => {
  it('locks after 5 consecutive failures with a 15-minute cooldown', () => {
    // These assertions fail loudly if the documented policy is ever regressed.
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
  });
});

describe('getEntry', () => {
  it('returns a zeroed entry for an unknown email', () => {
    expect(getEntry({}, EMAIL)).toEqual({
      failures: 0,
      firstFailureAt: null,
      lastFailureAt: null,
      lockedUntil: null,
    });
  });

  it('tolerates null/garbage state', () => {
    expect(getEntry(null, EMAIL).failures).toBe(0);
    expect(getEntry(undefined, EMAIL).failures).toBe(0);
  });
});

describe('recordFailure — counting and the threshold boundary', () => {
  it('increments the consecutive-failure counter', () => {
    const s1 = recordFailure({}, EMAIL, T0);
    expect(getEntry(s1, EMAIL).failures).toBe(1);
    const s2 = recordFailure(s1, EMAIL, T0 + 1);
    expect(getEntry(s2, EMAIL).failures).toBe(2);
  });

  it('does NOT lock at one below the threshold', () => {
    const state = failN({}, EMAIL, MAX_FAILED_ATTEMPTS - 1);
    const gate = evaluateAttempt(state, EMAIL, T0 + 1000);
    expect(gate.allowed).toBe(true);
    expect(getEntry(state, EMAIL).lockedUntil).toBeNull();
  });

  it('locks exactly at the threshold and sets lockedUntil = now + cooldown', () => {
    const state = failN({}, EMAIL, MAX_FAILED_ATTEMPTS);
    const entry = getEntry(state, EMAIL);
    expect(entry.failures).toBe(MAX_FAILED_ATTEMPTS);
    // The final failure happened at T0 + (MAX-1) ms.
    const lastNow = T0 + (MAX_FAILED_ATTEMPTS - 1);
    expect(entry.lockedUntil).toBe(lastNow + LOCKOUT_DURATION_MS);
  });

  it('does not mutate the input state (pure)', () => {
    const original = {};
    const next = recordFailure(original, EMAIL, T0);
    expect(original).toEqual({});
    expect(next).not.toBe(original);
  });

  it('preserves firstFailureAt across the streak but advances lastFailureAt', () => {
    const s = failN({}, EMAIL, 3);
    const entry = getEntry(s, EMAIL);
    expect(entry.firstFailureAt).toBe(T0);
    expect(entry.lastFailureAt).toBe(T0 + 2);
  });
});

describe('evaluateAttempt — lockout active vs expired', () => {
  it('blocks attempts while the lock is active', () => {
    const state = failN({}, EMAIL, MAX_FAILED_ATTEMPTS);
    const lockedUntil = getEntry(state, EMAIL).lockedUntil;

    // 1 ms before expiry — still locked.
    const during = evaluateAttempt(state, EMAIL, lockedUntil - 1);
    expect(during.allowed).toBe(false);
    expect(during.remainingMs).toBe(1);
    expect(during.remainingMinutes).toBe(1);
    expect(during.lockedUntil).toBe(lockedUntil);
  });

  it('allows attempts once the cooldown has elapsed', () => {
    const state = failN({}, EMAIL, MAX_FAILED_ATTEMPTS);
    const lockedUntil = getEntry(state, EMAIL).lockedUntil;

    // Exactly at expiry — no longer locked (remaining <= 0).
    const at = evaluateAttempt(state, EMAIL, lockedUntil);
    expect(at.allowed).toBe(true);
    expect(at.remainingMs).toBe(0);

    // Well after expiry — allowed.
    const after = evaluateAttempt(state, EMAIL, lockedUntil + 60_000);
    expect(after.allowed).toBe(true);
  });

  it('a failure AFTER the cooldown starts a fresh streak (does not instantly re-lock)', () => {
    const locked = failN({}, EMAIL, MAX_FAILED_ATTEMPTS);
    const lockedUntil = getEntry(locked, EMAIL).lockedUntil;

    // First failure after the lock expires.
    const afterExpiry = lockedUntil + 1000;
    const reFailed = recordFailure(locked, EMAIL, afterExpiry);
    const entry = getEntry(reFailed, EMAIL);
    expect(entry.failures).toBe(1);
    expect(entry.lockedUntil).toBeNull();
    expect(evaluateAttempt(reFailed, EMAIL, afterExpiry).allowed).toBe(true);
  });
});

describe('recordSuccess — resets the counter', () => {
  it('clears an email entry entirely on success (failures below threshold)', () => {
    const state = failN({}, EMAIL, 3);
    const cleared = recordSuccess(state, EMAIL);
    expect(getEntry(cleared, EMAIL).failures).toBe(0);
    expect(evaluateAttempt(cleared, EMAIL, T0 + 10).allowed).toBe(true);
  });

  it('clears an active lock on success', () => {
    const locked = failN({}, EMAIL, MAX_FAILED_ATTEMPTS);
    expect(evaluateAttempt(locked, EMAIL, T0 + 10).allowed).toBe(false);
    const cleared = recordSuccess(locked, EMAIL);
    expect(evaluateAttempt(cleared, EMAIL, T0 + 10).allowed).toBe(true);
  });

  it('does not mutate the input state (pure) and leaves other emails intact', () => {
    const state = failN(failN({}, EMAIL, 2), 'other@example.com', 1);
    const cleared = recordSuccess(state, EMAIL);
    expect(cleared).not.toBe(state);
    expect(getEntry(state, EMAIL).failures).toBe(2); // original untouched
    expect(getEntry(cleared, EMAIL).failures).toBe(0);
    expect(getEntry(cleared, 'other@example.com').failures).toBe(1);
  });

  it('is a no-op for an email with no history', () => {
    expect(recordSuccess({}, EMAIL)).toEqual({});
  });
});

describe('no-enumeration parity — unknown vs known email', () => {
  // The module never knows whether an email is a real account; the SAME code
  // path applies. These tests lock this in: identical inputs -> identical
  // observable throttle behaviour regardless of the address.
  const KNOWN = 'admin@propela.co.za';
  const UNKNOWN = 'does-not-exist@propela.co.za';

  it('produces identical entries for the same number of failures', () => {
    const knownState = failN({}, KNOWN, MAX_FAILED_ATTEMPTS);
    const unknownState = failN({}, UNKNOWN, MAX_FAILED_ATTEMPTS);

    const knownEntry = getEntry(knownState, KNOWN);
    const unknownEntry = getEntry(unknownState, UNKNOWN);
    expect(unknownEntry).toEqual(knownEntry);
  });

  it('locks and reports identical remaining time for both', () => {
    const knownState = failN({}, KNOWN, MAX_FAILED_ATTEMPTS);
    const unknownState = failN({}, UNKNOWN, MAX_FAILED_ATTEMPTS);
    const at = T0 + 1000;

    const knownGate = evaluateAttempt(knownState, KNOWN, at);
    const unknownGate = evaluateAttempt(unknownState, UNKNOWN, at);
    expect(unknownGate.allowed).toBe(knownGate.allowed);
    expect(unknownGate.remainingMs).toBe(knownGate.remainingMs);
    expect(unknownGate.remainingMinutes).toBe(knownGate.remainingMinutes);
  });

  it('normalizes casing/whitespace so variants share one counter', () => {
    let state = recordFailure({}, '  ADMIN@Propela.co.za ', T0);
    state = recordFailure(state, 'admin@propela.co.za', T0 + 1);
    expect(getEntry(state, 'Admin@Propela.CO.ZA').failures).toBe(2);
  });
});

describe('remaining-time helpers', () => {
  it('remainingLockMs returns 0 when not locked', () => {
    expect(remainingLockMs({}, EMAIL, T0)).toBe(0);
  });

  it('remainingLockMinutes rounds up and never shows 0 while active', () => {
    expect(remainingLockMinutes(0)).toBe(0);
    expect(remainingLockMinutes(1)).toBe(1); // <1 min still shows 1
    expect(remainingLockMinutes(60_000)).toBe(1);
    expect(remainingLockMinutes(61_000)).toBe(2);
    expect(remainingLockMinutes(15 * 60 * 1000)).toBe(15);
  });
});

describe('pruneExpired — housekeeping without changing decisions', () => {
  it('drops fully-expired locks but keeps active locks and live streaks', () => {
    const now = T0 + 100_000;
    const state = {
      'active@example.com': {
        failures: MAX_FAILED_ATTEMPTS,
        firstFailureAt: T0,
        lastFailureAt: T0,
        lockedUntil: now + 60_000, // still locked
      },
      'streak@example.com': {
        failures: 2,
        firstFailureAt: T0,
        lastFailureAt: T0,
        lockedUntil: null, // mid-streak, never locked
      },
      'expired@example.com': {
        failures: MAX_FAILED_ATTEMPTS,
        firstFailureAt: T0,
        lastFailureAt: T0,
        lockedUntil: now - 1, // lock already elapsed
      },
    };

    const pruned = pruneExpired(state, now);

    expect('active@example.com' in pruned).toBe(true);
    expect('streak@example.com' in pruned).toBe(true);
    expect('expired@example.com' in pruned).toBe(false);
  });

  it('does not silently forget a partial streak', () => {
    const state = failN({}, EMAIL, 2);
    const pruned = pruneExpired(state, T0 + 5);
    expect(getEntry(pruned, EMAIL).failures).toBe(2);
  });

  it('returns {} for null/garbage input', () => {
    expect(pruneExpired(null, T0)).toEqual({});
    expect(pruneExpired('nope', T0)).toEqual({});
  });
});

describe('buildLoginAuditEntry — audit shape, no secrets', () => {
  const requiredKeys = [
    'id',
    'timestamp',
    'user',
    'action',
    'entityType',
    'entityId',
    'ipAddress',
    'details',
    'severity',
  ];

  it('builds a failed-attempt entry with the standard shape', () => {
    const entry = buildLoginAuditEntry({ outcome: 'failed', email: EMAIL, failures: 2, now: T0 });
    requiredKeys.forEach((k) => expect(entry).toHaveProperty(k));
    expect(entry.action).toBe(LOGIN_FAILED_ACTION);
    expect(entry.severity).toBe('warning');
    expect(entry.entityType).toBe('auth');
    expect(entry.user).toBe(EMAIL);
    expect(entry.timestamp).toBe(new Date(T0).toISOString());
  });

  it('builds a lockout entry (critical)', () => {
    const entry = buildLoginAuditEntry({
      outcome: 'locked',
      email: EMAIL,
      remainingMinutes: 15,
      now: T0,
    });
    expect(entry.action).toBe(LOGIN_LOCKED_OUT_ACTION);
    expect(entry.severity).toBe('critical');
  });

  it('builds a success entry (info)', () => {
    const entry = buildLoginAuditEntry({ outcome: 'success', email: EMAIL, now: T0 });
    expect(entry.action).toBe(LOGIN_SUCCESS_ACTION);
    expect(entry.severity).toBe('info');
  });

  it('normalizes the attempted email and never includes a password/hash', () => {
    const entry = buildLoginAuditEntry({
      outcome: 'failed',
      email: '  ADMIN@Propela.co.za ',
      failures: 1,
      now: T0,
    });
    expect(entry.user).toBe('admin@propela.co.za');
    const serialized = JSON.stringify(entry).toLowerCase();
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('hash');
  });

  it('records an attempted email even when empty (no crash, no enumeration leak)', () => {
    const entry = buildLoginAuditEntry({ outcome: 'failed', email: '', now: T0 });
    expect(entry.user).toBe('(empty)');
  });
});
