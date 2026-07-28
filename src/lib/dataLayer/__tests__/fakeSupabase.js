/**
 * In-memory fake Supabase client + chainable query-builder mock.
 *
 * Used by the pure-logic property tests for the Supabase adapter (Properties 2,
 * 3, 7, 8, 9, 10, 11 and the fake-backed variants of 1). It emulates just enough
 * of the `supabase-js` / PostgREST surface that the adapter exercises:
 *
 *   client.from(table)
 *     .select('*', { count: 'exact' }).range(from, to).eq(col, val).order(col, { ascending })
 *     .insert(record).select().maybeSingle()
 *     .update(changes).eq('id', id).eq('version', v).select().maybeSingle()
 *     .delete().eq('id', id).eq('version', v).select().maybeSingle()
 *     .upsert(records, { onConflict }).select()
 *
 * The builder is *thenable*, so `await query` runs it and resolves to
 * `{ data, error, count }` exactly like the real client.
 *
 * Trigger emulation: every UPDATE bumps `version = OLD.version + 1` and sets a
 * fresh `updated_at`, mirroring the `bump_version()` Postgres trigger from the
 * design so concurrency and idempotence properties behave as they would against
 * a real database. INSERT defaults `version` to 1 only when absent (it does not
 * bump), preserving exact write-then-read round-trips.
 *
 * This is a test-support module (not a `*.test.js` file), so Vitest does not run
 * it as a suite.
 */

/** Deep clone via structured JSON round-trip (all fixtures are JSON-shaped). */
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

class FakeQueryBuilder {
  constructor(store, table, calls) {
    this.store = store;
    this.table = table;
    this.calls = calls;
    this.operation = 'select';
    this.filters = [];
    this._range = null;
    this._sort = null;
    this._single = false;
    this._countExact = false;
    this._payload = null;
    this._onConflict = 'id';
  }

  select(_columns, opts) {
    // `.select()` may follow insert/update/delete (returning rows) or start a read.
    if (opts && opts.count === 'exact') this._countExact = true;
    if (this.operation == null) this.operation = 'select';
    return this;
  }

  insert(record) {
    this.operation = 'insert';
    this._payload = record;
    return this;
  }

  update(changes) {
    this.operation = 'update';
    this._payload = changes;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  upsert(records, opts) {
    this.operation = 'upsert';
    this._payload = records;
    if (opts && opts.onConflict) this._onConflict = opts.onConflict;
    return this;
  }

  eq(column, value) {
    this.filters.push([column, value]);
    return this;
  }

  range(from, to) {
    this._range = [from, to];
    return this;
  }

  order(column, opts = {}) {
    this._sort = { column, ascending: opts.ascending !== false };
    return this;
  }

  maybeSingle() {
    this._single = true;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  _rows() {
    if (!this.store.has(this.table)) this.store.set(this.table, []);
    return this.store.get(this.table);
  }

  _matches(row) {
    return this.filters.every(([col, val]) => row[col] === val);
  }

  _record() {
    // Record the issued query so tests can assert server-side filtering.
    this.calls.push({
      table: this.table,
      operation: this.operation,
      filters: this.filters.map(([c, v]) => [c, v]),
      range: this._range,
      sort: this._sort,
    });
  }

  _run() {
    this._record();
    switch (this.operation) {
      case 'insert':
        return this._runInsert();
      case 'update':
        return this._runUpdate();
      case 'delete':
        return this._runDelete();
      case 'upsert':
        return this._runUpsert();
      case 'select':
      default:
        return this._runSelect();
    }
  }

  _shape(rows) {
    if (this._single) {
      const first = rows.length > 0 ? clone(rows[0]) : null;
      return { data: first, error: null, count: rows.length };
    }
    return { data: rows.map(clone), error: null, count: rows.length };
  }

  _runSelect() {
    let rows = this._rows().filter((row) => this._matches(row));
    const total = rows.length;
    if (this._sort) {
      const { column, ascending } = this._sort;
      rows = rows.slice().sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this._range) {
      const [from, to] = this._range;
      rows = rows.slice(from, to + 1);
    }
    if (this._single) {
      const first = rows.length > 0 ? clone(rows[0]) : null;
      return { data: first, error: null, count: total };
    }
    return { data: rows.map(clone), error: null, count: total };
  }

  _runInsert() {
    const rows = this._rows();
    const records = Array.isArray(this._payload) ? this._payload : [this._payload];
    const inserted = [];
    for (const rec of records) {
      const row = clone(rec);
      if (row.version == null) row.version = 1; // default only; no bump on insert
      if (this.table === 'nurses') {
        const now = new Date().toISOString();
        if (row.created_at == null) row.created_at = now;
        if (row.updated_at == null) row.updated_at = now;
      }
      rows.push(row);
      inserted.push(row);
    }
    return this._shape(inserted);
  }

  _runUpdate() {
    const rows = this._rows();
    const changed = [];
    for (const row of rows) {
      if (this._matches(row)) {
        Object.assign(row, clone(this._payload));
        // Emulate bump_version(): version advances regardless of the payload.
        const base = typeof row.version === 'number' ? row.version : 0;
        row.version = base + 1;
        row.updated_at = new Date().toISOString();
        changed.push(row);
      }
    }
    return this._shape(changed);
  }

  _runDelete() {
    const rows = this._rows();
    const removed = [];
    const kept = [];
    for (const row of rows) {
      if (this._matches(row)) removed.push(row);
      else kept.push(row);
    }
    this.store.set(this.table, kept);
    return this._shape(removed);
  }

  _runUpsert() {
    const rows = this._rows();
    const records = Array.isArray(this._payload) ? this._payload : [this._payload];
    const result = [];
    for (const rec of records) {
      const row = clone(rec);
      if (row.version == null) row.version = 1;
      const idx = rows.findIndex((r) => r[this._onConflict] === row[this._onConflict]);
      if (idx === -1) rows.push(row);
      else rows[idx] = row;
      result.push(row);
    }
    return this._shape(result);
  }

  // Thenable: awaiting the builder executes the accumulated query.
  then(resolve, reject) {
    try {
      resolve(this._run());
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }
}

/**
 * A fake supabase-js client backed by an in-memory Map of table → rows[].
 * `client.calls` records every issued query for server-side-filtering assertions.
 */
export class FakeSupabaseClient {
  /** @param {Record<string, Object[]>} [seed] Initial tables → rows. */
  constructor(seed = {}) {
    this.store = new Map();
    this.calls = [];
    for (const [table, rows] of Object.entries(seed)) {
      this.store.set(table, rows.map(clone));
    }
  }

  from(table) {
    return new FakeQueryBuilder(this.store, table, this.calls);
  }

  /**
   * Emulate a Postgres RPC. Currently supports `bulk_update(table_name, payload)`
   * from migration 0007: an ATOMIC, all-or-none mass update with a per-row
   * `version` gate. It applies the batch to a working copy and only commits when
   * every element matches an existing row's version; any missing/stale element
   * makes the whole call fail with a version-conflict error and mutates nothing —
   * mirroring the transactional rollback of the real function (Property 4).
   *
   * Returns a thenable resolving to `{ data, error }` like the real client.
   */
  rpc(fnName, args = {}) {
    const run = () => {
      this.calls.push({ operation: 'rpc', fn: fnName, args: clone(args) });
      if (fnName !== 'bulk_update') {
        return {
          data: null,
          error: { message: `unknown function ${fnName}`, code: '42883' },
        };
      }
      return this._bulkUpdate(args.table_name, args.payload);
    };
    return {
      then: (resolve, reject) => {
        try {
          resolve(run());
        } catch (err) {
          if (reject) reject(err);
          else throw err;
        }
      },
    };
  }

  /** Internal: atomic all-or-none bulk update against the in-memory store. */
  _bulkUpdate(table, payload) {
    if (!this.store.has(table)) this.store.set(table, []);
    const rows = this.store.get(table);

    if (!Array.isArray(payload)) {
      return { data: null, error: { message: 'payload must be a JSON array', code: '22023' } };
    }
    if (payload.length === 0) return { data: [], error: null };

    // Work on clones so a conflict leaves the committed store untouched.
    const working = rows.map(clone);
    const byId = new Map(working.map((r) => [r.id, r]));

    // Pass 1 — validate the whole batch against the version gate.
    for (const elem of payload) {
      const id = elem == null ? undefined : elem.id;
      if (id == null) {
        return {
          data: null,
          error: { message: 'every element must carry an "id"', code: '22023' },
        };
      }
      if (elem.version == null) {
        return {
          data: null,
          error: { message: `element id=${id} must carry a "version"`, code: '22023' },
        };
      }
      const existing = byId.get(id);
      if (!existing || existing.version !== elem.version) {
        // Message contains " conflict " (word-bounded) so mapError classifies it
        // as CONFLICT; DETAIL carries the offending id (like the real RPC).
        return {
          data: null,
          error: {
            message: `bulk_update: version conflict on table ${table} for id ${id}`,
            code: '40001',
            details: id,
          },
        };
      }
    }

    // Pass 2 — apply every change, emulating bump_version() on each row.
    const committed = [];
    for (const elem of payload) {
      const existing = byId.get(elem.id);
      const { version, created_at, updated_at, ...changes } = elem;
      void version;
      void created_at;
      void updated_at;
      Object.assign(existing, clone(changes));
      existing.version = elem.version + 1; // trigger-style bump
      existing.updated_at = new Date().toISOString();
      committed.push(clone(existing));
    }

    // Commit the working copy back to the store (all-or-none).
    this.store.set(table, working);
    return { data: committed, error: null };
  }

  /** Snapshot of a table's rows (deep-cloned) for before/after comparisons. */
  snapshot(table) {
    return (this.store.get(table) ?? []).map(clone);
  }

  /** Reset the recorded query log. */
  clearCalls() {
    this.calls = [];
  }
}

/**
 * A fake client whose every operation resolves to a driver error, used to drive
 * the failure branch of the loading/error-discipline property (Property 9).
 */
export class FailingSupabaseClient {
  constructor(error = { message: 'boom', code: 'XX000' }) {
    this.error = error;
  }

  from() {
    const err = this.error;
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      upsert: () => builder,
      eq: () => builder,
      range: () => builder,
      order: () => builder,
      maybeSingle: () => builder,
      single: () => builder,
      then: (resolve) => resolve({ data: null, error: err, count: 0 }),
    };
    return builder;
  }

  rpc() {
    const err = this.error;
    return { then: (resolve) => resolve({ data: null, error: err }) };
  }
}
