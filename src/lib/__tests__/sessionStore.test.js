import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSession, getSession, migrateLegacyAuthSession, setSession } from '../sessionStore';

// The store deliberately reuses the legacy key name so it can migrate old data.
const KEY = 'propela_ops_authSession';

// A representative session payload — ONLY non-sensitive identity fields, exactly
// what AuthContext.login() persists (never a password/hash).
const USER = { id: 'u-1', name: 'Ada Nurse', email: 'ada@propela.co.za', role: 'admin' };

beforeEach(() => {
  // jsdom provides both stores; setup.js does not reset sessionStorage between
  // tests, so clear both, then reset the module-level in-memory source of truth.
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('set/get/clear roundtrip', () => {
  it('starts signed out', () => {
    expect(getSession()).toBeNull();
  });

  it('sets, reads back, and clears the session', () => {
    setSession(USER);
    expect(getSession()).toEqual(USER);

    clearSession();
    expect(getSession()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('mirrors to sessionStorage and NEVER writes the session to localStorage', () => {
    setSession(USER);
    expect(JSON.parse(sessionStorage.getItem(KEY))).toEqual(USER);
    // The whole point of Fix #9: the identity token must not be in localStorage.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('treats a falsy value passed to setSession as a clear', () => {
    setSession(USER);
    setSession(null);
    expect(getSession()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});

describe('in-memory is the source of truth', () => {
  it('ignores a tampered sessionStorage mirror while in-memory holds a value', () => {
    setSession(USER);
    // Simulate a script mutating the mirror behind the store's back.
    sessionStorage.setItem(KEY, JSON.stringify({ ...USER, role: 'superadmin' }));
    // getSession must return the in-memory value, not the tampered mirror.
    expect(getSession()).toEqual(USER);
    expect(getSession().role).toBe('admin');
  });
});

describe('sessionStorage mirror survives a simulated reload', () => {
  it('re-hydrates a fresh module instance from the mirror', async () => {
    setSession(USER);

    // Simulate a page reload: a brand-new module instance (its in-memory var is
    // reset to null) while the SAME jsdom sessionStorage persists across
    // vi.resetModules(). This proves refresh-survival is driven by the mirror.
    vi.resetModules();
    const fresh = await import('../sessionStore');

    expect(fresh.getSession()).toEqual(USER);
  });

  it('a reload with an empty mirror stays signed out (no cross-tab persistence)', async () => {
    // Nothing set. A reload with an empty sessionStorage must remain signed out —
    // this is the intended behaviour change vs the old localStorage session.
    vi.resetModules();
    const fresh = await import('../sessionStore');
    expect(fresh.getSession()).toBeNull();
  });
});

describe('one-time migration off localStorage', () => {
  it('moves a legacy localStorage session into the store AND deletes the localStorage key', () => {
    const legacy = { id: 'u-2', name: 'Legacy User', email: 'legacy@propela.co.za', role: 'staff' };
    localStorage.setItem(KEY, JSON.stringify(legacy));

    // Lazy path: getSession() triggers the migration.
    const migrated = getSession();

    expect(migrated).toEqual(legacy);
    // The stale, higher-risk localStorage token must be gone.
    expect(localStorage.getItem(KEY)).toBeNull();
    // ...and it must now live in the sessionStorage mirror.
    expect(JSON.parse(sessionStorage.getItem(KEY))).toEqual(legacy);
  });

  it('migrateLegacyAuthSession returns null when there is nothing to migrate', () => {
    expect(migrateLegacyAuthSession()).toBeNull();
    expect(getSession()).toBeNull();
  });

  it('removes an unparseable legacy key without adopting it', () => {
    localStorage.setItem(KEY, '{ not valid json');
    expect(migrateLegacyAuthSession()).toBeNull();
    // Even garbage must not be left behind in the higher-risk store.
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(getSession()).toBeNull();
  });

  it('is idempotent — a second call finds nothing left to migrate', () => {
    localStorage.setItem(KEY, JSON.stringify(USER));
    expect(migrateLegacyAuthSession()).toEqual(USER);
    expect(migrateLegacyAuthSession()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('clearSession also purges any lingering legacy localStorage copy', () => {
    localStorage.setItem(KEY, JSON.stringify(USER));
    clearSession();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('graceful fallback when sessionStorage access throws', () => {
  it('keeps working in-memory when setItem/getItem throw', () => {
    const proto = Object.getPrototypeOf(window.sessionStorage);
    vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new Error('sessionStorage blocked (private mode)');
    });
    vi.spyOn(proto, 'getItem').mockImplementation(() => {
      throw new Error('sessionStorage blocked (private mode)');
    });

    // Writing must not throw even though the mirror write fails...
    expect(() => setSession(USER)).not.toThrow();
    // ...and the in-memory source of truth still answers reads.
    expect(getSession()).toEqual(USER);
  });

  it('returns null (never throws) when the mirror is unreadable and memory is empty', () => {
    const proto = Object.getPrototypeOf(window.sessionStorage);
    vi.spyOn(proto, 'getItem').mockImplementation(() => {
      throw new Error('sessionStorage blocked');
    });

    clearSession(); // memory empty
    expect(() => getSession()).not.toThrow();
    expect(getSession()).toBeNull();
  });
});
