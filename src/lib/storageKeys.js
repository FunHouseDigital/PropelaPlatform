/**
 * Versioned storage-key namespace + one-time prefix rotation (Security Fix #10).
 *
 * SINGLE SOURCE OF TRUTH for the app-wide web-storage key prefix. Both
 * `storage.js` (localStorage bulk data + the Fix #8 login throttle) and
 * `sessionStore.js` (the Fix #9 auth-session mirror in sessionStorage) import the
 * prefix/version from here, so the literal is defined in exactly ONE place and is
 * never hardcoded anywhere else.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VERSION HISTORY
 *   v1 (legacy): 'propela_ops_'      — everything up to and including Fix #9.
 *   v2 (current): 'propela_ops_v2_'  — Fix #10 onward.
 *
 * `LEGACY_STORAGE_PREFIXES` lists every prefix a value may have been written
 * under by an older build. On init we rotate any value found under a legacy
 * prefix into the current `STORAGE_PREFIX` (see `rotateStorageKeys`). Add the
 * previous prefix here (and bump `STORAGE_PREFIX_VERSION`) whenever the schema is
 * versioned again in future.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS IS — AND IS NOT (honest framing, mirroring authUsers.js /
 * sessionStore.js / loginThrottle.js):
 * A versioned prefix is NAMESPACING / STORAGE HYGIENE, **not a security control**.
 * It buys three things: (1) collision avoidance so Propela Ops keys can't clash
 * with another app on the same origin, (2) clean, atomic schema upgrades, and
 * (3) the ability to invalidate/upgrade an old storage-schema version in one
 * step. It does **NOT** encrypt anything and it is **NOT an XSS boundary** — both
 * localStorage and sessionStorage remain plain JavaScript-readable by any script
 * running in the tab. Only a real backend issuing `httpOnly`, `Secure`,
 * `SameSite` cookies fully mitigates token/identity theft, and that remains a
 * server-side task once a backend exists. Do not overstate what this buys us.
 */

/**
 * The current schema/prefix version. Bump this (and push the old prefix onto
 * `LEGACY_STORAGE_PREFIXES`) whenever the storage namespace is rotated again.
 * @type {string}
 */
export const STORAGE_PREFIX_VERSION = 'v2';

/**
 * The current, versioned key prefix prepended to every logical key in both
 * stores. Logical key names (e.g. 'nurses', 'loginThrottle', 'authSession') are
 * UNCHANGED by Fix #10 — only this physical prefix changed from the v1
 * 'propela_ops_' to the versioned 'propela_ops_v2_'.
 * @type {string}
 */
export const STORAGE_PREFIX = `propela_ops_${STORAGE_PREFIX_VERSION}_`;

/**
 * Every prefix a value may have been persisted under by an older build. Used by
 * `rotateStorageKeys` to migrate stale keys into the current namespace. Ordered
 * newest-legacy-first is fine; rotation is order-independent.
 *
 * NOTE: the current `STORAGE_PREFIX` itself begins with the legacy
 * 'propela_ops_' string, so rotation explicitly skips keys already under the
 * current prefix to avoid double-prefixing (see `rotateStorageKeys`).
 * @type {string[]}
 */
export const LEGACY_STORAGE_PREFIXES = ['propela_ops_'];

/**
 * Prepend the current versioned prefix to a logical key.
 * @param {string} key logical (unprefixed) key, e.g. 'nurses'
 * @returns {string} physical key, e.g. 'propela_ops_v2_nurses'
 */
export function withPrefix(key) {
  return STORAGE_PREFIX + key;
}

/**
 * Enumerate every key currently held in a Storage-like object without throwing.
 * A snapshot array is returned so callers can safely mutate the store while
 * iterating. Returns `[]` when the store is unavailable or enumeration throws.
 * @param {Storage|null|undefined} store
 * @returns {string[]}
 */
function snapshotKeys(store) {
  const keys = [];
  try {
    const len = store.length;
    for (let i = 0; i < len; i += 1) {
      const k = store.key(i);
      if (typeof k === 'string') keys.push(k);
    }
  } catch {
    // Enumeration unavailable (store blocked / non-conforming) — nothing to do.
  }
  return keys;
}

/**
 * One-time, idempotent prefix rotation for a single Storage surface.
 *
 * For every key found under any `LEGACY_STORAGE_PREFIXES` entry, copy its value
 * to the equivalently-named key under the current `STORAGE_PREFIX` — but ONLY if
 * the new key is not already set (never clobber newer data) — then remove the
 * legacy key so nothing stale is left behind in the old namespace.
 *
 * Design notes:
 *  • Keys already under the current `STORAGE_PREFIX` are skipped. This is
 *    essential because `STORAGE_PREFIX` ('propela_ops_v2_') itself begins with
 *    the legacy prefix ('propela_ops_'), so without the skip a v2 key would be
 *    re-prefixed into 'propela_ops_v2_v2_…'.
 *  • Enumeration is generic (length/key(i)) — it does NOT rely on any seed list,
 *    so helper-only keys (reportTemplates, recentSearches, savedViews, …) rotate
 *    too.
 *  • Every access is wrapped in try/catch and this function NEVER throws; it
 *    degrades gracefully (does nothing) when the store is unavailable.
 *  • Idempotent: after a full rotation every key is under `STORAGE_PREFIX`, so a
 *    second call finds nothing left under a legacy prefix.
 *
 * This function is prefix-agnostic about WHAT it moves — callers decide which
 * store(s) to rotate. The auth session's placement (in-memory + sessionStorage,
 * never localStorage) is enforced by `sessionStore.js`, which owns the
 * localStorage auth-key purge separately.
 *
 * @param {Storage|null|undefined} store a localStorage/sessionStorage-like object
 * @returns {number} the number of legacy keys removed (useful for tests/logging)
 */
export function rotateStorageKeys(store) {
  if (!store) return 0;

  const keys = snapshotKeys(store);
  let rotated = 0;

  for (const legacyPrefix of LEGACY_STORAGE_PREFIXES) {
    for (const key of keys) {
      // Already in the current namespace — leave it alone (and avoid the
      // double-prefix trap described above).
      if (key.startsWith(STORAGE_PREFIX)) continue;
      if (!key.startsWith(legacyPrefix)) continue;

      const logicalKey = key.slice(legacyPrefix.length);
      const newKey = STORAGE_PREFIX + logicalKey;

      try {
        const legacyValue = store.getItem(key);
        const existing = store.getItem(newKey);
        // Copy only when the new key is empty — never overwrite newer data.
        if (existing === null && legacyValue !== null) {
          store.setItem(newKey, legacyValue);
        }
        // Always remove the legacy key so nothing stale lingers in the old
        // namespace, even when we chose not to copy (new key already present).
        store.removeItem(key);
        rotated += 1;
      } catch {
        // Best-effort per key: a single failing key must not abort the rest.
      }
    }
  }

  return rotated;
}
