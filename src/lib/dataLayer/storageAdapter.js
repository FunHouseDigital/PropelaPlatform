/**
 * Legacy localStorage adapter (Task 2.3).
 *
 * Wraps the existing synchronous `src/lib/storage.js` behind the Data_Layer's
 * async, result-envelope API so the legacy path keeps working unchanged while
 * the `SUPABASE_BACKEND` flag is OFF (Req 9.1). Every operation is `async` and
 * resolves to an envelope shaped like the Supabase adapter's, so the facade can
 * route to either adapter without callers noticing the difference.
 *
 * Envelope shapes (mirrors design.md "Data_Layer public API"):
 *   list      -> { data: Row[], error: DataError|null, page, pageSize, total }
 *   getById   -> { data: Row|null, error: DataError|null }
 *   create    -> { data: Row,    error: DataError|null }
 *   update    -> { data: Row|null, error: DataError|null, conflict? }
 *   remove    -> { error: DataError|null, conflict? }
 *   getCollection -> { data: Row[]|Object, error: DataError|null }
 *   saveCollection-> { data: Row[]|Object, error: DataError|null }
 *
 * The legacy store is a synchronous in-browser copy, so filtering/sorting/paging
 * are applied client-side here — that is correct and authoritative for the
 * localStorage path (the Supabase adapter pushes these to the server instead).
 *
 * Requirements: 6.1 (retrieval + persistence per domain), 6.3 (empty list is
 * `[]`, never null), 6.7 (errors surfaced, never discarded), 9.1 (legacy path).
 */

import * as storage from '../storage';
import { getDomain } from './domains';
import { DataError, DataErrorCode, mapError } from './errors';

/** Pagination bounds shared with the Supabase adapter (Req 12.1). */
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Resolve a domain config or produce a VALIDATION error for unknown domains. */
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

/**
 * Read the whole backing value for a domain via its legacy getter (falling back
 * to the raw storage key), normalizing collections to an array.
 */
function readBacking(domain) {
  if (domain.legacyGetter && typeof storage[domain.legacyGetter] === 'function') {
    return storage[domain.legacyGetter]();
  }
  const raw = storage.getData(domain.key);
  if (raw != null) return raw;
  return domain.kind === 'collection' ? [] : null;
}

/** Persist the whole backing value for a domain via its legacy saver. */
function writeBacking(domain, value) {
  if (domain.legacySaver && typeof storage[domain.legacySaver] === 'function') {
    storage[domain.legacySaver](value);
    return;
  }
  storage.setData(domain.key, value);
}

/** Ensure a collection read is always an array (Req 6.3). */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Clamp a requested page size into [1, MAX_PAGE_SIZE], defaulting to 25. */
function clampPageSize(pageSize) {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
}

/** Apply simple equality filters (mirrors PostgREST `eq`). */
function matchesFilters(row, filters) {
  return Object.entries(filters).every(([key, val]) => row?.[key] === val);
}

/**
 * List records for a collection domain with client-side eq-filtering, optional
 * sort, and pagination.
 *
 * @param {string} name
 * @param {{ page?: number, pageSize?: number, filters?: Object, sort?: { column: string, asc?: boolean } }} [opts]
 */
export async function list(name, opts = {}) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, filters = {}, sort } = opts;
  const size = clampPageSize(pageSize);
  const effectivePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  try {
    const domain = requireDomain(name);
    let rows = asArray(readBacking(domain));

    if (filters && Object.keys(filters).length > 0) {
      rows = rows.filter((row) => matchesFilters(row, filters));
    }

    const activeSort = sort || domain.defaultListConfig.sort;
    if (activeSort && activeSort.column) {
      const { column, asc = true } = activeSort;
      rows = rows.slice().sort((a, b) => {
        const av = a?.[column];
        const bv = b?.[column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
    }

    const total = rows.length;
    const from = (effectivePage - 1) * size;
    const data = rows.slice(from, from + size);
    return { data, error: null, page: effectivePage, pageSize: size, total };
  } catch (error) {
    return {
      data: [],
      error: mapError(error),
      page: effectivePage,
      pageSize: size,
      total: 0,
    };
  }
}

/**
 * Read a single record by primary key.
 * @param {string} name
 * @param {string} id
 */
export async function getById(name, id) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const data = rows.find((row) => row?.[domain.primaryKey] === id) ?? null;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Append a new record to a collection and persist the whole collection.
 * @param {string} name
 * @param {Object} record
 */
export async function create(name, record) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const next = [...rows, record];
    writeBacking(domain, next);
    return { data: record, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Update a record by id, applying `changes`. When `baseVersion` is provided and
 * the stored record carries a `version`, a mismatch yields a conflict result
 * carrying the current committed value (optimistic concurrency, Req 2.5) — this
 * keeps the legacy path behaviourally aligned with the Supabase adapter.
 *
 * @param {string} name
 * @param {string} id
 * @param {Object} changes
 * @param {number} [baseVersion]
 */
export async function update(name, id, changes, baseVersion) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const index = rows.findIndex((row) => row?.[domain.primaryKey] === id);
    if (index === -1) {
      return { data: null, error: null, conflict: { current: null } };
    }

    const current = rows[index];
    if (
      baseVersion != null &&
      current.version != null &&
      current.version !== baseVersion
    ) {
      return { data: null, error: null, conflict: { current } };
    }

    const updated = {
      ...current,
      ...changes,
      [domain.primaryKey]: id,
    };
    if (current.version != null) {
      updated.version = current.version + 1;
    }

    const next = rows.slice();
    next[index] = updated;
    writeBacking(domain, next);
    return { data: updated, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Delete a record by id, with the same optional version gate as {@link update}.
 * @param {string} name
 * @param {string} id
 * @param {number} [baseVersion]
 */
export async function remove(name, id, baseVersion) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const target = rows.find((row) => row?.[domain.primaryKey] === id);
    if (!target) {
      return { error: null };
    }
    if (
      baseVersion != null &&
      target.version != null &&
      target.version !== baseVersion
    ) {
      return { error: null, conflict: { current: target } };
    }
    const next = rows.filter((row) => row?.[domain.primaryKey] !== id);
    writeBacking(domain, next);
    return { error: null };
  } catch (error) {
    return { error: mapError(error) };
  }
}

/**
 * Bulk create-or-update by primary key, persisting the whole collection once.
 * @param {string} name
 * @param {Object[]} records
 */
export async function bulkUpsert(name, records) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const byId = new Map(rows.map((row) => [row?.[domain.primaryKey], row]));
    for (const record of records ?? []) {
      byId.set(record?.[domain.primaryKey], record);
    }
    const next = Array.from(byId.values());
    writeBacking(domain, next);
    return { data: records ?? [], error: null };
  } catch (error) {
    return { data: [], error: mapError(error) };
  }
}

/**
 * Atomic, all-or-none mass update (Task 7.2, Req 2.3, 11.5, 11.6). Mirrors the
 * Supabase adapter's `bulkUpdate` so the two adapters are interchangeable behind
 * the facade. Because the legacy store is a single synchronous in-browser copy,
 * atomicity is achieved by applying the whole batch to a working copy and only
 * persisting it once every element has passed its `version` gate:
 *   - validate every element and confirm each targets an existing row whose
 *     stored `version` matches the record's `version`;
 *   - if ANY element is missing or stale, return a `conflict` and write NOTHING
 *     (so a subsequent read shows every row at its pre-update value);
 *   - otherwise apply all changes, advance each touched row's `version`, and
 *     persist the collection once.
 *
 * @param {string} name
 * @param {Object[]} records Batch of `{ id, version, ...changes }` records.
 * @returns {Promise<{ data: Object[]|null, error: DataError|null, conflict?: { current: null, ids: string[] } }>}
 */
export async function bulkUpdate(name, records) {
  try {
    const domain = requireDomain(name);
    const rows = asArray(readBacking(domain));
    const batch = Array.isArray(records) ? records : [];

    if (batch.length === 0) return { data: [], error: null };

    // Work on clones so a mid-batch conflict leaves the live store untouched.
    const working = rows.map((row) => ({ ...row }));
    const workingById = new Map(
      working.map((row) => [row?.[domain.primaryKey], row]),
    );

    // Pass 1 — validate + version-check the entire batch before mutating.
    for (const record of batch) {
      if (record == null || typeof record !== 'object' || Array.isArray(record)) {
        return { data: null, error: new DataError(DataErrorCode.VALIDATION, 'Record must be an object.') };
      }
      const id = record[domain.primaryKey];
      if (typeof id !== 'string' || id.length === 0) {
        return {
          data: null,
          error: new DataError(
            DataErrorCode.VALIDATION,
            `Record must have a non-empty string "${domain.primaryKey}".`,
          ),
        };
      }
      const existing = workingById.get(id);
      // Missing row, or a stale/mismatched version ⇒ conflict, commit none.
      if (
        !existing ||
        (record.version != null &&
          existing.version != null &&
          existing.version !== record.version)
      ) {
        return { data: null, error: null, conflict: { current: null, ids: [id] } };
      }
    }

    // Pass 2 — apply every change and advance the concurrency token.
    const committed = [];
    for (const record of batch) {
      const id = record[domain.primaryKey];
      const existing = workingById.get(id);
      const updated = { ...existing, ...record, [domain.primaryKey]: id };
      if (existing.version != null) {
        updated.version = existing.version + 1;
      }
      workingById.set(id, updated);
      committed.push(updated);
    }

    writeBacking(domain, Array.from(workingById.values()));
    return { data: committed, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Whole-collection retrieval mirroring `storage.js` getX() — returns the array
 * (or singleton object) as-is inside an envelope. Preserves the compatibility
 * surface AppContext uses today (Req 6.1).
 * @param {string} name
 */
export async function getCollection(name) {
  try {
    const domain = requireDomain(name);
    const value = readBacking(domain);
    if (domain.kind === 'collection') {
      return { data: asArray(value), error: null };
    }
    return { data: value ?? null, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}

/**
 * Whole-collection persistence mirroring `storage.js` saveX(value).
 * @param {string} name
 * @param {Object[]|Object} value
 */
export async function saveCollection(name, value) {
  try {
    const domain = requireDomain(name);
    writeBacking(domain, value);
    return { data: value, error: null };
  } catch (error) {
    return { data: null, error: mapError(error) };
  }
}
