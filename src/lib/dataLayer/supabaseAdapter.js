/**
 * Supabase adapter — generic Data_Layer operations (Task 5).
 *
 * This module is the Supabase-backed half of the Data_Layer seam. It mirrors the
 * `storageAdapter` interface exactly (same function names, same result-envelope
 * shapes) so the facade (`index.js`) can bind either adapter interchangeably and
 * callers cannot tell which one is active. The legacy `localStorage` path stays
 * the live default because the `SUPABASE_BACKEND` flag is OFF; these code paths
 * are exercised by tests (flag ON, mocked client) until the intentional cutover.
 *
 * Design references (design.md):
 *   - "Data-Access Layer Design": generic list/get/create/update/delete
 *     pseudocode, pagination clamp, server-side filtering, conditional updates.
 *   - "Conflict-detection strategy": conditional writes gated on the last-read
 *     `version`; zero affected rows ⇒ re-read the current committed value and
 *     return a `conflict` (Req 2.4, 2.5, 2.6, 11.3).
 *   - "Error mapping": every driver error is normalized via `mapError`; the
 *     adapter never throws across the async boundary (Req 6.7).
 *
 * Import-safety: this module obtains the client lazily through
 * `getSupabaseClient()` (a memoized factory), so merely importing the adapter
 * never instantiates the client or touches the network. That keeps the legacy
 * path safe when the flag is OFF and lets tests inject a fake client via
 * {@link __setClientFactory}.
 *
 * Session attachment (Req 3.7, 10.1): `supabase-js` automatically attaches the
 * authenticated session's Bearer JWT to every PostgREST request, so this adapter
 * does not manage tokens directly — every call below is authenticated by the
 * active session and constrained by Postgres RLS.
 */

import { getSupabaseClient } from '../supabaseClient';
import { getDomain, listDomains } from './domains';
import { DataError, DataErrorCode, mapError } from './errors';

/** Pagination bounds (Req 12.1). Shared conceptually with the legacy adapter. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

/** Per-request network timeout in milliseconds (Req 1.4, 1.5, 9.3, 12.6). */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Client factory indirection. Defaults to the real lazy `getSupabaseClient`
 * factory; tests override it with a fake in-memory client via
 * {@link __setClientFactory}. Kept module-local so nothing runs at import time.
 */
let clientFactory = getSupabaseClient;

/**
 * Override the client factory (test seam). Passing a falsy value restores the
 * real `getSupabaseClient` factory.
 * @param {null|(() => any)} factory
 */
export function __setClientFactory(factory) {
  clientFactory = factory || getSupabaseClient;
}

/** Obtain the active supabase-js client (or the injected fake). */
function client() {
  return clientFactory();
}

// ---- Small internal helpers ------------------------------------------------

/** Resolve a domain config or throw a VALIDATION DataError for unknown names. */
function requireDomain(name) {
  const domain = getDomain(name);
  if (!domain) {
    throw new DataError(
      DataErrorCode.VALIDATION,
      `Unknown data domain: ${String(name)}`,
    );
  }
  return domain;
}

/** Clamp a requested page number to a positive integer (defaults to 1). */
function clampPage(page) {
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

/**
 * Clamp a requested page size into [MIN_PAGE_SIZE, MAX_PAGE_SIZE], defaulting to
 * DEFAULT_PAGE_SIZE when unspecified/invalid, and treating non-positive sizes as
 * the valid minimum (Property 10, Req 12.1).
 */
export function clampPageSize(pageSize) {
  if (pageSize == null || !Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(MIN_PAGE_SIZE, Math.floor(pageSize)), MAX_PAGE_SIZE);
}

/**
 * Race a promise (typically a supabase-js query builder, which is thenable)
 * against a timeout that rejects with a NETWORK DataError (Req 6.6/6.7). Exposed
 * so callers and tests can wrap arbitrary async work with the same discipline.
 *
 * @template T
 * @param {PromiseLike<T>} promise The in-flight network operation.
 * @param {number} [ms] Timeout in milliseconds.
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms = REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new DataError(
          DataErrorCode.NETWORK,
          'The request timed out. Check your connection and try again.',
        ),
      );
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Drive a loading flag around an adapter operation so callers (e.g. AppContext,
 * Task 9) can render spinners and surface errors uniformly (Req 6.6, 6.7).
 * `loading` is reported `true` before the operation and `false` once it settles;
 * on failure the settled `error` is passed through, never discarded.
 *
 * The adapter itself returns already-settled envelopes; this helper exposes the
 * true→false loading pattern the design's loading/error state model prescribes.
 *
 * @template T
 * @param {() => Promise<T & { error?: unknown }>} operation
 * @param {(state: { loading: boolean, error: unknown }) => void} [onState]
 * @returns {Promise<T & { error?: unknown }>}
 */
export async function withLoading(operation, onState) {
  if (onState) onState({ loading: true, error: null });
  try {
    const result = await operation();
    const error = result && 'error' in result ? result.error : null;
    if (onState) onState({ loading: false, error: error ?? null });
    return result;
  } catch (err) {
    // Operations are not expected to throw (they return envelopes), but keep the
    // loading discipline intact if one ever does.
    const error = mapError(err);
    if (onState) onState({ loading: false, error });
    throw err;
  }
}

/** Deep structural equality for JSON-shaped values (used by the saveX diff). */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/** Concurrency/audit metadata that the DB owns; ignored when diffing records. */
const META_COLUMNS = ['version', 'created_at', 'updated_at'];

/** Return a shallow copy of a record without DB-owned metadata columns. */
function stripMeta(record) {
  if (!record || typeof record !== 'object') return record;
  const clone = { ...record };
  for (const col of META_COLUMNS) delete clone[col];
  return clone;
}

// ---- Validation (Req 6.5, Property 8) --------------------------------------

/**
 * Minimal, conservative per-domain validation used by create/update/delete so
 * invalid records are rejected before any write reaches the database (Req 6.5).
 * Kept intentionally permissive so it never rejects valid seed records:
 *   - the record must be a plain object;
 *   - for a *collection* domain it must carry a non-empty string primary key.
 *
 * @param {import('./domains').DomainConfig} domain
 * @param {unknown} record
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateRecord(domain, record) {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, message: 'Record must be an object.' };
  }
  if (domain.kind === 'collection') {
    const id = record[domain.primaryKey];
    if (typeof id !== 'string' || id.length === 0) {
      return {
        ok: false,
        message: `Record must have a non-empty string "${domain.primaryKey}".`,
      };
    }
  }
  return { ok: true };
}

/** Validate a partial `changes` payload for update: it must be a plain object. */
function validateChanges(changes) {
  if (changes == null || typeof changes !== 'object' || Array.isArray(changes)) {
    return { ok: false, message: 'Changes must be an object.' };
  }
  return { ok: true };
}

/** Build a VALIDATION DataError from a failed validation result. */
function validationError(message) {
  return new DataError(DataErrorCode.VALIDATION, message);
}

// ---- Generic operations ----------------------------------------------------

/**
 * List records for a collection domain with server-side pagination, equality
 * filtering, and optional sort (Req 6.2, 6.3, 12.1, 12.3).
 *
 * @param {string} name Domain name.
 * @param {{ page?: number, pageSize?: number, filters?: Object, sort?: { column: string, asc?: boolean } }} [opts]
 * @returns {Promise<{ data: Object[], error: DataError|null, page: number, pageSize: number, total: number }>}
 */
export async function list(name, opts = {}) {
  const { page = 1, pageSize, filters = {}, sort } = opts;
  const effPage = clampPage(page);
  const size = clampPageSize(pageSize);
  try {
    const domain = requireDomain(name);
    const activeSort = sort || domain.defaultListConfig.sort;
    const from = (effPage - 1) * size;
    const to = from + size - 1;

    // `count: 'exact'` yields the total row count for pagination (Req 12.1).
    let query = client()
      .from(domain.table)
      .select('*', { count: 'exact' })
      .range(from, to);

    // Server-side equality filtering — issued to the DB, never applied to a full
    // client-side copy (Req 12.3, Property 11).
    for (const [column, value] of Object.entries(filters || {})) {
      query = query.eq(column, value);
    }

    if (activeSort && activeSort.column) {
      query = query.order(activeSort.column, { ascending: activeSort.asc !== false });
    }

    const { data, error, count } = await withTimeout(query);
    if (error) {
      return { data: [], error: mapError(error), page: effPage, pageSize: size, total: 0 };
    }
    // Empty result contract: `data` is always an array, never null (Req 6.3).
    return {
      data: data ?? [],
      error: null,
      page: effPage,
      pageSize: size,
      total: count ?? 0,
    };
  } catch (error) {
    return { data: [], error: mapError(error), page: effPage, pageSize: size, total: 0 };
  }
}

/**
 * Read a single record by primary key (Req 6.2).
 * @param {string} name
 * @param {string} id
 * @returns {Promise<{ data: Object|null, error: DataError|null }>}
 */
export async function getById(name, id) {
  try {
    const domain = requireDomain(name);
    const { data, error } = await withTimeout(
      client().from(domain.table).select('*').eq(domain.primaryKey, id).maybeSingle(),
    );
    if (error) return { data: null, error: mapError(error) };
    return { data: data ?? null, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Validate then insert a record, returning the committed row incl. its `version`
 * (Req 6.4, 6.5). A validation failure returns a VALIDATION error and issues no
 * write (Property 8).
 * @param {string} name
 * @param {Object} record
 * @returns {Promise<{ data: Object|null, error: DataError|null }>}
 */
export async function create(name, record) {
  try {
    const domain = requireDomain(name);
    const check = validateRecord(domain, record);
    if (!check.ok) return { data: null, error: validationError(check.message) };

    const { data, error } = await withTimeout(
      client().from(domain.table).insert(record).select().maybeSingle(),
    );
    if (error) return { data: null, error: mapError(error) };
    return { data: data ?? null, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Conditionally update a record with optimistic-concurrency conflict detection
 * (Req 2.4, 2.5, 2.6, 11.3). The update is gated on both the primary key and the
 * last-read `version`; if it affects zero rows the row changed since it was read,
 * so the current committed value is re-read and returned under `conflict`.
 *
 * @param {string} name
 * @param {string} id
 * @param {Object} changes
 * @param {number} [baseVersion]
 * @returns {Promise<{ data: Object|null, error: DataError|null, conflict?: { current: Object|null } }>}
 */
export async function update(name, id, changes, baseVersion) {
  try {
    const domain = requireDomain(name);
    const check = validateChanges(changes);
    if (!check.ok) return { data: null, error: validationError(check.message) };

    let query = client().from(domain.table).update(changes).eq(domain.primaryKey, id);
    if (baseVersion != null) query = query.eq('version', baseVersion);

    const { data, error } = await withTimeout(query.select().maybeSingle());
    if (error) return { data: null, error: mapError(error) };

    if (!data) {
      // Zero rows changed ⇒ stale base version (or missing row). Re-read the
      // current committed value so the UI can show it (Req 2.5, 2.6).
      const { data: current } = await withTimeout(
        client().from(domain.table).select('*').eq(domain.primaryKey, id).maybeSingle(),
      );
      return { data: null, error: null, conflict: { current: current ?? null } };
    }
    return { data, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Conditionally delete a record, returning a conflict when the version gate does
 * not match an existing row (Req 2.5, 6.5). A missing row is treated as an
 * idempotent no-op (no conflict).
 *
 * @param {string} name
 * @param {string} id
 * @param {number} [baseVersion]
 * @returns {Promise<{ error: DataError|null, conflict?: { current: Object|null } }>}
 */
export async function remove(name, id, baseVersion) {
  try {
    const domain = requireDomain(name);
    let query = client().from(domain.table).delete().eq(domain.primaryKey, id);
    if (baseVersion != null) query = query.eq('version', baseVersion);

    const { data, error } = await withTimeout(query.select().maybeSingle());
    if (error) return { error: mapError(error) };

    if (baseVersion != null && !data) {
      // Nothing deleted under the version gate: distinguish a stale version
      // (row still exists ⇒ conflict) from an already-absent row (no-op).
      const { data: current } = await withTimeout(
        client().from(domain.table).select('*').eq(domain.primaryKey, id).maybeSingle(),
      );
      if (current) return { error: null, conflict: { current } };
      return { error: null };
    }
    return { error: null };
  } catch (error) {
    return { error: mapError(error) };
  }
}

/**
 * Create-or-update by primary key. This is a non-atomic convenience upsert kept
 * so the adapter interface matches `storageAdapter`; the atomic, transactional
 * mass-update path is delivered as a Postgres RPC in Task 7.
 *
 * @param {string} name
 * @param {Object[]} records
 * @returns {Promise<{ data: Object[], error: DataError|null }>}
 */
export async function bulkUpsert(name, records) {
  try {
    const domain = requireDomain(name);
    const rows = Array.isArray(records) ? records : [];
    for (const record of rows) {
      const check = validateRecord(domain, record);
      if (!check.ok) return { data: [], error: validationError(check.message) };
    }
    const { data, error } = await withTimeout(
      client().from(domain.table).upsert(rows, { onConflict: domain.primaryKey }).select(),
    );
    if (error) return { data: [], error: mapError(error) };
    return { data: data ?? [], error: null };
  } catch (error) {
    return { data: [], error: mapError(error) };
  }
}

/**
 * Atomic mass update via the transactional Postgres RPC (Task 7.2, Req 2.3,
 * 11.5, 11.6). Delegates the whole batch to the `bulk_update(table_name, payload)`
 * function created in migration 0007, which applies every element inside one
 * transaction with a per-row `version` gate and rolls the WHOLE call back if any
 * element's version check fails. This is the atomic counterpart to the
 * non-transactional {@link bulkUpsert} convenience helper.
 *
 * Each record must carry its primary key and the last-read `version` so the
 * server can gate the update; validation runs client-side first so an invalid
 * batch never reaches the database (Req 6.5). On success the committed rows are
 * returned; when any element conflicts, the RPC raises and NOTHING is committed,
 * and this returns a `conflict` envelope (mirroring `update`) carrying the
 * offending id when the driver surfaces it — never a partial `data` array.
 *
 * @param {string} name Domain name.
 * @param {Object[]} records Batch of `{ id, version, ...changes }` records.
 * @returns {Promise<{ data: Object[]|null, error: DataError|null, conflict?: { current: null, ids: string[], message: string } }>}
 */
export async function bulkUpdate(name, records) {
  try {
    const domain = requireDomain(name);
    const rows = Array.isArray(records) ? records : [];

    // Validate every element up front; a single bad record rejects the batch
    // with a VALIDATION error and issues no write (Req 6.5, Property 8).
    for (const record of rows) {
      const check = validateRecord(domain, record);
      if (!check.ok) return { data: null, error: validationError(check.message) };
      if (record.version == null) {
        return {
          data: null,
          error: validationError('Each record must carry its last-read "version".'),
        };
      }
    }

    // Empty batch is a successful no-op (nothing to commit).
    if (rows.length === 0) return { data: [], error: null };

    const { data, error } = await withTimeout(
      client().rpc('bulk_update', { table_name: domain.table, payload: rows }),
    );

    if (error) {
      const mapped = mapError(error);
      // A version-gate failure rolls the batch back; surface it as a conflict
      // (committing none) rather than an opaque error (Req 2.3, 11.6).
      if (mapped.code === DataErrorCode.CONFLICT) {
        const detail = typeof error?.details === 'string' ? error.details : null;
        return {
          data: null,
          error: null,
          conflict: {
            current: null,
            ids: detail ? [detail] : [],
            message: mapped.message,
          },
        };
      }
      return { data: null, error: mapped };
    }

    return { data: data ?? [], error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Whole-collection retrieval mirroring `storage.js` getX(). For a collection it
 * returns every row as an array (Req 6.3, never null); for a singleton it returns
 * the single row or null.
 * @param {string} name
 * @returns {Promise<{ data: Object[]|Object|null, error: DataError|null }>}
 */
export async function getCollection(name) {
  try {
    const domain = requireDomain(name);
    if (domain.kind === 'collection') {
      const { data, error } = await withTimeout(client().from(domain.table).select('*'));
      if (error) return { data: [], error: mapError(error) };
      return { data: data ?? [], error: null };
    }
    const { data, error } = await withTimeout(
      client().from(domain.table).select('*').maybeSingle(),
    );
    if (error) return { data: null, error: mapError(error) };
    return { data: data ?? null, error: null };
  } catch (error) {
    const domain = getDomain(name);
    const empty = domain && domain.kind === 'collection' ? [] : null;
    return { data: empty, error: mapError(error) };
  }
}

/**
 * Whole-collection persistence mirroring `storage.js` saveX(value) — the
 * compatibility shim `AppContext` uses today (Req 6.1). It diffs the desired
 * array against the current committed state and issues versioned create/update/
 * delete operations so concurrency tokens advance correctly:
 *   - records present in `value` but not in the DB      → create
 *   - records present in both whose business fields differ → conditional update
 *     carrying the current row's `version`
 *   - records present in the DB but absent from `value` → conditional delete
 *
 * Singleton domains upsert the single row directly.
 *
 * @param {string} name
 * @param {Object[]|Object} value
 * @returns {Promise<{ data: Object[]|Object|null, error: DataError|null }>}
 */
export async function saveCollection(name, value) {
  try {
    const domain = requireDomain(name);

    if (domain.kind !== 'collection') {
      const { data, error } = await withTimeout(
        client().from(domain.table).upsert(value).select().maybeSingle(),
      );
      if (error) return { data: null, error: mapError(error) };
      return { data: data ?? value, error: null };
    }

    const desired = Array.isArray(value) ? value : [];

    // Read the current committed state to diff against (Req 6.1, 2.1).
    const { data: currentRows, error: readError } = await withTimeout(
      client().from(domain.table).select('*'),
    );
    if (readError) return { data: null, error: mapError(readError) };

    const currentById = new Map(
      (currentRows ?? []).map((row) => [row[domain.primaryKey], row]),
    );
    const desiredById = new Map(desired.map((rec) => [rec[domain.primaryKey], rec]));

    // Creates and updates.
    for (const rec of desired) {
      const id = rec[domain.primaryKey];
      const existing = currentById.get(id);
      if (!existing) {
        const res = await create(name, rec);
        if (res.error) return { data: null, error: res.error };
      } else if (!deepEqual(stripMeta(existing), stripMeta(rec))) {
        const res = await update(name, id, rec, existing.version);
        if (res.error) return { data: null, error: res.error };
      }
    }

    // Deletes for rows no longer present in the desired collection.
    for (const existing of currentById.values()) {
      const id = existing[domain.primaryKey];
      if (!desiredById.has(id)) {
        const res = await remove(name, id, existing.version);
        if (res.error) return { data: null, error: res.error };
      }
    }

    return { data: desired, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

// ---- Per-domain bindings + saveX compatibility shims (Task 5.14) -----------

/** Capitalize the first character of a domain name. */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Naive singularization for building `getNurse`/`createNurse`-style names. */
function singularize(name) {
  if (/ies$/.test(name)) return name.replace(/ies$/, 'y');
  if (/sses$/.test(name)) return name.replace(/es$/, '');
  if (/s$/.test(name)) return name.replace(/s$/, '');
  return name;
}

/**
 * Per-domain Supabase bindings generated from the registry, e.g.
 * `perDomain.listNurses({ page })`, `perDomain.getNurse(id)`,
 * `perDomain.createNurse(rec)`, `perDomain.updateNurse(id, changes, v)`,
 * `perDomain.deleteNurse(id, v)`, plus the whole-collection `saveNurses(array)`
 * compatibility shim (Req 6.1, 1.1, 1.2, 2.1).
 *
 * Building this map is pure (no client instantiation), keeping import side
 * effect free.
 * @type {Record<string, Function>}
 */
export const perDomain = {};

for (const domain of listDomains()) {
  const plural = capitalize(domain.name);
  const singular = capitalize(singularize(domain.name));

  perDomain[`list${plural}`] = (opts) => list(domain.name, opts);
  perDomain[`get${singular}`] = (id) => getById(domain.name, id);
  perDomain[`create${singular}`] = (record) => create(domain.name, record);
  perDomain[`update${singular}`] = (id, changes, baseVersion) =>
    update(domain.name, id, changes, baseVersion);
  perDomain[`delete${singular}`] = (id, baseVersion) =>
    remove(domain.name, id, baseVersion);
  perDomain[`bulkUpsert${plural}`] = (records) => bulkUpsert(domain.name, records);
  perDomain[`bulkUpdate${plural}`] = (records) => bulkUpdate(domain.name, records);

  // saveX / getX compatibility shims keyed by the exact storage.js names.
  if (domain.legacySaver) {
    perDomain[domain.legacySaver] = (arr) => saveCollection(domain.name, arr);
  }
  if (domain.legacyGetter) {
    perDomain[domain.legacyGetter] = () => getCollection(domain.name);
  }
}
