/**
 * Authenticated-user session store (Security Fix #9).
 *
 * Holds the signed-in user's *identity* (never a password/hash) for Propela Ops.
 * The source of truth is a module-level **in-memory** variable; a **sessionStorage**
 * entry is kept only as a *refresh-survival mirror* so a page reload within the
 * SAME TAB keeps the user signed in. `storage.js`'s
 * getAuthSession/saveAuthSession/clearAuthSession now route through here, so the
 * public auth interface (and AuthContext) is unchanged.
 *
 * WHY in-memory + sessionStorage (and not localStorage):
 * The session used to live in `localStorage` under `propela_ops_authSession`.
 * `localStorage` is shared across every tab for the origin and persists until
 * explicitly cleared, so an XSS payload could read the identity token from any
 * tab and it survived tab/browser close — a large blast radius. Moving to
 * in-memory (source of truth) + `sessionStorage` (mirror) shrinks that radius:
 *   • the token no longer survives tab close,
 *   • it is not shared to other tabs/windows, and
 *   • the theft window is shorter (tab lifetime, not "forever").
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HONEST FRAMING — READ THIS (mirrors authUsers.js / exportGuard.js /
 * loginThrottle.js):
 * This is a BLAST-RADIUS REDUCTION, NOT A FIX. `sessionStorage` is still plain
 * JavaScript-readable by ANY script running in the tab, so in-page XSS can still
 * read this session while the tab is open. Propela Ops is a front-end-only app
 * with NO backend, so `httpOnly`, `Secure`, `SameSite` cookies — the only thing
 * that actually keeps a session token out of reach of page scripts — are
 * impossible here. Real mitigation MUST be done server-side with httpOnly
 * cookies once a backend exists. Do not overstate what this buys us.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every `sessionStorage`/`localStorage` access is wrapped in try/catch and falls
 * back to in-memory-only, so the store never throws in environments where web
 * storage is unavailable or blocked (tests / SSR / Safari private mode / storage
 * disabled). In those environments the session simply lives for the lifetime of
 * the JS runtime and is lost on reload — which is a safe degradation.
 */

/**
 * App-wide storage key prefix. Kept identical to `storage.js` on purpose — key
 * namespacing/versioning is explicitly out of scope for Fix #9 and is handled by
 * Fix #10 (key-prefix renaming / rotation).
 */
const STORAGE_PREFIX = 'propela_ops_';

/**
 * The session key. Deliberately the SAME name the legacy localStorage session
 * used (`propela_ops_authSession`) so the one-time migration can find the old
 * value and so nothing else in the app has to learn a new key.
 */
const SESSION_KEY = `${STORAGE_PREFIX}authSession`;

/**
 * The in-memory source of truth. `null` means "signed out". This is a plain
 * module-level variable: it is per-tab, never shared with other tabs, and gone
 * the moment the JS runtime is torn down (tab close / hard reload).
 * @type {object|null}
 */
let memorySession = null;

/**
 * Resolve the `sessionStorage` object without ever throwing. Returns `null` when
 * it is unavailable (SSR, disabled, or access itself throws — e.g. sandboxed
 * iframes). Callers must treat `null` as "mirror unavailable, in-memory only".
 * @returns {Storage|null}
 */
function safeSessionStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
      return globalThis.sessionStorage;
    }
  } catch {
    // Accessing sessionStorage can itself throw in some locked-down contexts.
  }
  return null;
}

/**
 * Resolve the `localStorage` object without ever throwing. Only used by the
 * one-time legacy migration; the live session never reads/writes localStorage.
 * @returns {Storage|null}
 */
function safeLocalStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Accessing localStorage can itself throw in some locked-down contexts.
  }
  return null;
}

/**
 * Read the session from the sessionStorage mirror, or `null` on any problem
 * (missing, unparsable, or storage throws). Never throws.
 * @returns {object|null}
 */
function readMirror() {
  const ss = safeSessionStorage();
  if (!ss) return null;
  try {
    const raw = ss.getItem(SESSION_KEY);
    if (raw === null || raw === undefined) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Write the session to the sessionStorage mirror. Best-effort: if storage is
 * unavailable or throws (private mode / quota), the in-memory copy is still the
 * source of truth, so we simply degrade to in-memory-only. Never throws.
 * @param {object} user
 */
function writeMirror(user) {
  const ss = safeSessionStorage();
  if (!ss) return;
  try {
    ss.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // In-memory remains authoritative; nothing else to do.
  }
}

/**
 * Remove the session from the sessionStorage mirror. Never throws.
 */
function clearMirror() {
  const ss = safeSessionStorage();
  if (!ss) return;
  try {
    ss.removeItem(SESSION_KEY);
  } catch {
    // Ignore — in-memory has already been cleared by the caller.
  }
}

/**
 * One-time migration OFF the higher-risk localStorage.
 *
 * If a legacy `propela_ops_authSession` entry exists in `localStorage` (written
 * by pre-Fix-#9 builds), copy it into the new session store (in-memory +
 * sessionStorage mirror) and DELETE the localStorage copy so no stale identity
 * token is left behind in the more exposed, cross-tab, persistent store. This
 * keeps a currently-signed-in user signed in across the upgrade within the same
 * tab. Idempotent and safe to call repeatedly; never throws.
 *
 * @returns {object|null} the migrated session, or `null` if there was nothing to
 * migrate.
 */
export function migrateLegacyAuthSession() {
  const ls = safeLocalStorage();
  if (!ls) return null;

  let raw;
  try {
    raw = ls.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (raw === null || raw === undefined) return null;

  // Regardless of whether the value is parseable, remove the legacy copy so we
  // never leave a stale token behind in the higher-risk store.
  try {
    ls.removeItem(SESSION_KEY);
  } catch {
    // If we cannot remove it we still avoid trusting it below.
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  // Adopt it into the new store.
  memorySession = parsed;
  writeMirror(parsed);
  return memorySession;
}

/**
 * Hydrate the in-memory source of truth from persistence. Runs the one-time
 * legacy migration first (so any old localStorage token is moved + purged), then
 * falls back to the sessionStorage mirror (refresh-survival). Never throws.
 * @returns {object|null}
 */
function hydrateFromPersistence() {
  const migrated = migrateLegacyAuthSession();
  if (migrated !== null) return migrated;
  memorySession = readMirror();
  return memorySession;
}

/**
 * Get the current session (the signed-in user's identity), or `null` when
 * signed out. In-memory is the source of truth; when it is empty (e.g. after a
 * page reload re-created the module) we hydrate from the sessionStorage mirror
 * (and migrate any legacy localStorage token). Never throws.
 * @returns {object|null}
 */
export function getSession() {
  if (memorySession !== null) return memorySession;
  return hydrateFromPersistence();
}

/**
 * Set the current session. In-memory is updated first (the source of truth) and
 * the sessionStorage mirror is best-effort updated for refresh survival. Passing
 * a falsy value clears the session. Only non-sensitive identity fields should be
 * passed in (id, name, email, role) — this store never adds a password/hash.
 * @param {object|null} user
 */
export function setSession(user) {
  if (!user) {
    clearSession();
    return;
  }
  memorySession = user;
  writeMirror(user);
}

/**
 * Clear the session everywhere: the in-memory source of truth, the
 * sessionStorage mirror, and (defensively) any lingering legacy localStorage
 * copy. Never throws.
 */
export function clearSession() {
  memorySession = null;
  clearMirror();
  // Defensive: ensure no legacy localStorage token can outlive a logout.
  const ls = safeLocalStorage();
  if (ls) {
    try {
      ls.removeItem(SESSION_KEY);
    } catch {
      // Ignore.
    }
  }
}
