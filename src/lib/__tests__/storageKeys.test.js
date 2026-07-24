import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession } from '../sessionStore';
import {
  getAuthSession,
  getData,
  getLoginThrottle,
  initializeData,
} from '../storage';
import {
  LEGACY_STORAGE_PREFIXES,
  rotateStorageKeys,
  STORAGE_PREFIX,
  STORAGE_PREFIX_VERSION,
  withPrefix,
} from '../storageKeys';

const LEGACY_PREFIX = 'propela_ops_'; // the v1 (pre-#10) prefix

/**
 * A minimal, spec-compliant in-memory Storage double that supports key
 * enumeration (length / key(i)), used to exercise the generic rotation helper in
 * isolation and to inject failures.
 */
function makeStore(initial = {}) {
  let store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] ?? null,
    // test helper
    _dump: () => ({ ...store }),
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shared prefix constants', () => {
  it('exposes a single versioned prefix derived from the version', () => {
    expect(STORAGE_PREFIX_VERSION).toBe('v2');
    expect(STORAGE_PREFIX).toBe('propela_ops_v2_');
    expect(LEGACY_STORAGE_PREFIXES).toContain(LEGACY_PREFIX);
    expect(withPrefix('nurses')).toBe('propela_ops_v2_nurses');
  });

  it('the current prefix begins with a legacy prefix (rotation must handle this)', () => {
    // Guards the double-prefix trap: because 'propela_ops_v2_' startsWith
    // 'propela_ops_', rotation has to skip already-current keys.
    expect(STORAGE_PREFIX.startsWith(LEGACY_PREFIX)).toBe(true);
  });
});

describe('rotateStorageKeys — generic behaviour on an isolated store', () => {
  it('copies a legacy key to the versioned key and deletes the legacy key', () => {
    const store = makeStore({
      [`${LEGACY_PREFIX}nurses`]: JSON.stringify([{ id: 'n1' }]),
      [`${LEGACY_PREFIX}settings`]: JSON.stringify({ theme: 'dark' }),
      // an unrelated foreign key must be left completely untouched
      other_app_key: 'keep-me',
    });

    const removed = rotateStorageKeys(store);
    const dump = store._dump();

    expect(removed).toBe(2);
    expect(JSON.parse(dump[`${STORAGE_PREFIX}nurses`])).toEqual([{ id: 'n1' }]);
    expect(JSON.parse(dump[`${STORAGE_PREFIX}settings`])).toEqual({ theme: 'dark' });
    expect(dump[`${LEGACY_PREFIX}nurses`]).toBeUndefined();
    expect(dump[`${LEGACY_PREFIX}settings`]).toBeUndefined();
    expect(dump.other_app_key).toBe('keep-me');
  });

  it('is idempotent — a second rotation finds nothing left under the legacy prefix', () => {
    const store = makeStore({ [`${LEGACY_PREFIX}nurses`]: '[]' });
    expect(rotateStorageKeys(store)).toBe(1);
    expect(rotateStorageKeys(store)).toBe(0);
    expect(store._dump()[`${STORAGE_PREFIX}nurses`]).toBe('[]');
  });

  it('does NOT overwrite a value already present under the versioned key, but still deletes the legacy key', () => {
    const store = makeStore({
      [`${LEGACY_PREFIX}nurses`]: JSON.stringify(['stale']),
      [`${STORAGE_PREFIX}nurses`]: JSON.stringify(['newer']),
    });

    rotateStorageKeys(store);
    const dump = store._dump();

    expect(JSON.parse(dump[`${STORAGE_PREFIX}nurses`])).toEqual(['newer']);
    expect(dump[`${LEGACY_PREFIX}nurses`]).toBeUndefined();
  });

  it('never double-prefixes an already-current key', () => {
    const store = makeStore({ [`${STORAGE_PREFIX}nurses`]: '[]' });
    rotateStorageKeys(store);
    const dump = store._dump();
    expect(dump[`${STORAGE_PREFIX}nurses`]).toBe('[]');
    expect(dump[`${STORAGE_PREFIX}${STORAGE_PREFIX}nurses`]).toBeUndefined();
    expect(dump[`propela_ops_v2_v2_nurses`]).toBeUndefined();
  });

  it('never throws and returns 0 when the store is null/undefined', () => {
    expect(() => rotateStorageKeys(null)).not.toThrow();
    expect(rotateStorageKeys(null)).toBe(0);
    expect(rotateStorageKeys(undefined)).toBe(0);
  });

  it('degrades gracefully when enumeration throws', () => {
    const badStore = {
      get length() {
        throw new Error('enumeration blocked');
      },
      key: () => {
        throw new Error('blocked');
      },
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    expect(() => rotateStorageKeys(badStore)).not.toThrow();
    expect(rotateStorageKeys(badStore)).toBe(0);
  });

  it('degrades gracefully when a per-key access throws mid-rotation', () => {
    const store = makeStore({
      [`${LEGACY_PREFIX}a`]: '1',
      [`${LEGACY_PREFIX}b`]: '2',
    });
    // Make getItem throw only for the first key; the helper must keep going.
    const realGet = store.getItem;
    let calls = 0;
    store.getItem = (k) => {
      calls += 1;
      if (calls === 1) throw new Error('flaky read');
      return realGet(k);
    };

    expect(() => rotateStorageKeys(store)).not.toThrow();
    // The second key still rotated.
    expect(store._dump()[`${STORAGE_PREFIX}b`]).toBe('2');
  });
});

describe('rotateStorageKeys — across the real localStorage and sessionStorage', () => {
  it('rotates keys in localStorage', () => {
    localStorage.setItem(`${LEGACY_PREFIX}nurses`, JSON.stringify([{ id: 'n1' }]));
    rotateStorageKeys(localStorage);
    expect(localStorage.getItem(`${LEGACY_PREFIX}nurses`)).toBeNull();
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}nurses`))).toEqual([{ id: 'n1' }]);
  });

  it('rotates keys in sessionStorage', () => {
    sessionStorage.setItem(`${LEGACY_PREFIX}authSession`, JSON.stringify({ id: 'u1' }));
    rotateStorageKeys(sessionStorage);
    expect(sessionStorage.getItem(`${LEGACY_PREFIX}authSession`)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(`${STORAGE_PREFIX}authSession`))).toEqual({ id: 'u1' });
  });
});

describe('Fix #10 upgrade via initializeData — pre-#10 state survives the rotation', () => {
  it('keeps a currently-signed-in user signed in (sessionStorage mirror rotated)', () => {
    const user = { id: 'u-9', name: 'Signed In', email: 'in@propela.co.za', role: 'admin' };
    // Pre-#10 world: the Fix #9 mirror sits under the legacy prefix.
    sessionStorage.setItem(`${LEGACY_PREFIX}authSession`, JSON.stringify(user));

    initializeData();

    // Still signed in, now under the versioned key; legacy key purged.
    expect(getAuthSession()).toEqual(user);
    expect(sessionStorage.getItem(`${LEGACY_PREFIX}authSession`)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(`${STORAGE_PREFIX}authSession`))).toEqual(user);
    // And the auth token is NOT sitting in localStorage under any prefix.
    expect(localStorage.getItem(`${LEGACY_PREFIX}authSession`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_PREFIX}authSession`)).toBeNull();
  });

  it('keeps an active loginThrottle lockout (rotated within localStorage, not moved to sessionStorage)', () => {
    const lockout = {
      'user@propela.co.za': {
        failures: 5,
        firstFailureAt: 1000,
        lastFailureAt: 2000,
        lockedUntil: 9_999_999_999_999,
      },
    };
    // Pre-#10 world: throttle counters under the legacy localStorage prefix.
    localStorage.setItem(`${LEGACY_PREFIX}loginThrottle`, JSON.stringify(lockout));

    initializeData();

    // Lockout survived and is readable through the unchanged helper.
    expect(getLoginThrottle()).toEqual(lockout);
    // Rotated within localStorage; legacy key gone, versioned key present.
    expect(localStorage.getItem(`${LEGACY_PREFIX}loginThrottle`)).toBeNull();
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}loginThrottle`))).toEqual(lockout);
    // Deliberately NOT moved to sessionStorage (would let a lockout be reset by
    // closing the tab — that would weaken Fix #8).
    expect(sessionStorage.getItem(`${STORAGE_PREFIX}loginThrottle`)).toBeNull();
    expect(sessionStorage.getItem(`${LEGACY_PREFIX}loginThrottle`)).toBeNull();
  });

  it('rotation through initializeData is idempotent and preserves logical keys/values', () => {
    const nurses = [{ id: 'n1', fullName: 'Nurse One' }];
    localStorage.setItem(`${LEGACY_PREFIX}nurses`, JSON.stringify(nurses));

    initializeData();
    initializeData(); // second upgrade must be a no-op for rotation

    expect(getData('nurses')).toEqual(nurses);
    expect(localStorage.getItem(`${LEGACY_PREFIX}nurses`)).toBeNull();
    // No key remains under the stale prefix after the upgrade.
    const leftoverLegacy = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_PREFIX) && !k.startsWith(STORAGE_PREFIX)) {
        leftoverLegacy.push(k);
      }
    }
    expect(leftoverLegacy).toEqual([]);
  });
});
