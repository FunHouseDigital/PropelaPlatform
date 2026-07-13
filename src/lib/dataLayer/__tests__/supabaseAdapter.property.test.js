import fc from 'fast-check';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { DataErrorCode } from '../errors';
import * as adapter from '../supabaseAdapter';
import { FailingSupabaseClient, FakeSupabaseClient } from './fakeSupabase';

/**
 * Property-based tests for the Supabase adapter generic operations (Task 5).
 *
 * These are the pure-logic properties (2, 3, 7, 8, 9, 10, 11) plus the
 * fake-backed variants of the store-level properties (1, 3). They run against an
 * in-memory fake supabase-js client/query-builder (see ./fakeSupabase.js) so no
 * real database is required. Properties 1 and 3 SHOULD ALSO be run against a
 * local Supabase/Postgres instance in CI (Task 13) to exercise the real
 * bump_version trigger and PostgREST conditional updates.
 *
 * The adapter obtains its client through an injectable factory; each test points
 * that factory at a fresh fake via `__setClientFactory`.
 */

const NUM_RUNS = 100;

// Active fake client for the current test; the adapter reads it via the factory.
let currentClient = new FakeSupabaseClient();

beforeEach(() => {
  currentClient = new FakeSupabaseClient();
  adapter.__setClientFactory(() => currentClient);
});

afterAll(() => {
  // Restore the real factory so nothing leaks into other suites.
  adapter.__setClientFactory(null);
});

/** Strip DB-owned metadata so business fields can be compared directly. */
function businessFields(row) {
  if (!row) return row;
  const { version, created_at, updated_at, ...rest } = row;
  void version;
  void created_at;
  void updated_at;
  return rest;
}

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 10: Pagination clamping
// Validates: Requirements 12.1
// ---------------------------------------------------------------------------
describe('Property 10: Pagination clamping', () => {
  it('clamps effective page size to [1,100], defaults to 25, and bounds returned length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -20, max: 40 }), // page (incl. non-positive)
        fc.option(fc.integer({ min: -50, max: 500 }), { nil: undefined }), // pageSize
        fc.array(
          fc.record({ id: fc.uuid(), tier: fc.constantFrom('A', 'B', 'C') }),
          { minLength: 0, maxLength: 60 },
        ),
        async (page, pageSize, rows) => {
          const seeded = rows.map((r, i) => ({ ...r, id: `row-${i}`, version: 1 }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          const res = await adapter.list('nurses', { page, pageSize });

          // Effective size within [1,100].
          expect(res.pageSize).toBeGreaterThanOrEqual(1);
          expect(res.pageSize).toBeLessThanOrEqual(100);
          // Default of 25 when unspecified.
          if (pageSize === undefined) expect(res.pageSize).toBe(25);
          // Never return more than the effective page size.
          expect(res.data.length).toBeLessThanOrEqual(res.pageSize);
          expect(res.error).toBeNull();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 7: Empty-result contract
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------
describe('Property 7: Empty-result contract', () => {
  it('returns data === [] and error === null when nothing matches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('A', 'B', 'C'), { minLength: 0, maxLength: 40 }),
        async (tiers) => {
          const seeded = tiers.map((tier, i) => ({ id: `row-${i}`, tier, version: 1 }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          // Sentinel value guaranteed absent from the backing data.
          const res = await adapter.list('nurses', { filters: { tier: '__none__' } });

          expect(res.error).toBeNull();
          expect(res.data).toEqual([]);
          expect(Array.isArray(res.data)).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 11: Server-side filter soundness and completeness
// Validates: Requirements 12.3, 2.3
// ---------------------------------------------------------------------------
describe('Property 11: Server-side filter soundness and completeness', () => {
  it('returns exactly the server-filtered page and issues the filter to the DB', async () => {
    const STAGES = ['screening', 'offer', 'placed', 'onboarding'];
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({ stage: fc.constantFrom(...STAGES), tier: fc.constantFrom('A', 'B') }),
          { minLength: 0, maxLength: 80 },
        ),
        fc.constantFrom(...STAGES),
        async (rows, filterStage) => {
          const seeded = rows.map((r, i) => ({
            id: `row-${i}`,
            pipeline_stage: r.stage,
            tier: r.tier,
            version: 1,
          }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          const res = await adapter.list('nurses', {
            pageSize: 100,
            filters: { pipeline_stage: filterStage },
          });

          // Soundness: every returned row satisfies the predicate.
          expect(res.data.every((row) => row.pipeline_stage === filterStage)).toBe(true);

          // Completeness: the page equals the expected server-filtered page.
          const expected = seeded.filter((row) => row.pipeline_stage === filterStage);
          expect(res.data).toEqual(expected);
          expect(res.total).toBe(expected.length);

          // The eq filter was issued to the (fake) DB, not applied client-side
          // to a full copy — assert the query builder received it.
          const selectCall = currentClient.calls.find((c) => c.operation === 'select');
          expect(selectCall).toBeDefined();
          expect(selectCall.filters).toContainEqual(['pipeline_stage', filterStage]);
          expect(selectCall.range).toEqual([0, 99]);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 2: Concurrency conflict detection / no lost updates
// Validates: Requirements 2.4, 2.5, 11.2, 11.3
// ---------------------------------------------------------------------------
describe('Property 2: Concurrency conflict detection / no lost updates', () => {
  it('commits exactly one of two same-base updates; the stale one conflicts and does not overwrite', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 6 }),
        fc.string({ minLength: 1, maxLength: 6 }),
        async (valA, valB) => {
          fc.pre(valA !== valB);
          currentClient = new FakeSupabaseClient({
            nurses: [{ id: 'nurse-1', tier: 'seed', version: 1 }],
          });
          adapter.__setClientFactory(() => currentClient);

          // Both updates were prepared against the same base version (1).
          const first = await adapter.update('nurses', 'nurse-1', { tier: valA }, 1);
          const second = await adapter.update('nurses', 'nurse-1', { tier: valB }, 1);

          // Exactly one commits (the first); it returns committed data, no conflict.
          expect(first.error).toBeNull();
          expect(first.conflict).toBeUndefined();
          expect(first.data).not.toBeNull();
          expect(first.data.tier).toBe(valA);
          expect(first.data.version).toBe(2);

          // The stale update is rejected as a conflict carrying the current value.
          expect(second.data).toBeNull();
          expect(second.error).toBeNull();
          expect(second.conflict).toBeDefined();
          expect(second.conflict.current.tier).toBe(valA);
          expect(second.conflict.current.version).toBe(2);

          // The newer committed value is unchanged by the stale write.
          const read = await adapter.getById('nurses', 'nurse-1');
          expect(read.data.tier).toBe(valA);
          expect(read.data.version).toBe(2);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 8: Validation rejection leaves the database unchanged
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------
describe('Property 8: Validation rejection leaves the database unchanged', () => {
  it('rejects invalid records with a VALIDATION error and never mutates the store', async () => {
    const invalidRecordArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.string(),
      fc.array(fc.anything()),
      fc.record({ tier: fc.string() }), // object missing the required string id
      fc.record({ id: fc.integer(), tier: fc.string() }), // non-string id
      fc.record({ id: fc.constant(''), tier: fc.string() }), // empty id
    );

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ id: fc.uuid(), tier: fc.constantFrom('A', 'B') }), {
          minLength: 0,
          maxLength: 20,
        }),
        invalidRecordArb,
        async (seedRows, invalid) => {
          const seeded = seedRows.map((r, i) => ({ ...r, id: `row-${i}`, version: 1 }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          const before = currentClient.snapshot('nurses');

          const res = await adapter.create('nurses', invalid);
          expect(res.error).not.toBeNull();
          expect(res.error.code).toBe(DataErrorCode.VALIDATION);

          // Invalid update changes (non-object) are likewise rejected.
          const upd = await adapter.update('nurses', 'row-0', 42, 1);
          expect(upd.error?.code).toBe(DataErrorCode.VALIDATION);

          const after = currentClient.snapshot('nurses');
          expect(after).toEqual(before);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 9: Async loading/error state discipline
// Validates: Requirements 6.6, 6.7
// ---------------------------------------------------------------------------
describe('Property 9: Async loading/error state discipline', () => {
  it('drives loading true→false and surfaces non-null errors on failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (shouldFail) => {
        currentClient = shouldFail
          ? new FailingSupabaseClient()
          : new FakeSupabaseClient({ nurses: [{ id: 'n-1', tier: 'A', version: 1 }] });
        adapter.__setClientFactory(() => currentClient);

        const states = [];
        const res = await adapter.withLoading(
          () => adapter.list('nurses', {}),
          (s) => states.push(s),
        );

        // Loading was signalled true first, then settled false.
        expect(states[0].loading).toBe(true);
        expect(states[states.length - 1].loading).toBe(false);

        if (shouldFail) {
          expect(res.error).not.toBeNull();
          expect(states[states.length - 1].error).not.toBeNull();
        } else {
          expect(res.error).toBeNull();
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('a timed-out request settles as a NETWORK error (loading returns to false)', async () => {
    // A never-settling operation must be bounded by the per-request timeout.
    const hanging = new Promise(() => {});
    const states = [];
    await expect(
      adapter.withLoading(async () => {
        states.push('start');
        await adapter.withTimeout(hanging, 5);
        return { error: null };
      }, undefined),
    ).rejects.toMatchObject({ code: DataErrorCode.NETWORK });
    expect(states).toContain('start');
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 1: Write-then-read consistency (round-trip)
// Validates: Requirements 11.1, 1.1, 1.2
// NOTE: also run against a local Supabase/Postgres instance in CI (Task 13).
// ---------------------------------------------------------------------------
describe('Property 1: Write-then-read consistency (fake-backed; also run vs. local Postgres in CI)', () => {
  it('read(write(r)) deep-equals r across nested JSONB fields', async () => {
    const nurseArb = fc.record({
      id: fc.uuid().map((u) => `nurse-${u}`),
      version: fc.constant(1),
      full_name: fc.string(),
      pipeline_stage: fc.constantFrom('screening', 'offer', 'placed'),
      final_score: fc.double({ min: 0, max: 100, noNaN: true }),
      scorecard_fields: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
      additional_certifications: fc.array(fc.string(), { maxLength: 5 }),
      communication_log: fc.array(
        fc.record({ at: fc.string(), note: fc.string() }),
        { maxLength: 5 },
      ),
    });

    await fc.assert(
      fc.asyncProperty(nurseArb, async (record) => {
        currentClient = new FakeSupabaseClient({ nurses: [] });
        adapter.__setClientFactory(() => currentClient);

        const created = await adapter.create('nurses', record);
        expect(created.error).toBeNull();

        const read = await adapter.getById('nurses', record.id);
        expect(read.error).toBeNull();
        expect(read.data).toEqual(record);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 3: Update idempotence
// Validates: Requirements 11.4
// NOTE: also run against a local Supabase/Postgres instance in CI (Task 13).
// ---------------------------------------------------------------------------
describe('Property 3: Update idempotence (fake-backed; also run vs. local Postgres in CI)', () => {
  it('applying an idempotent change N>=2 times equals applying it once (business fields)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ tier: fc.string(), pipeline_stage: fc.constantFrom('offer', 'placed') }),
        fc.integer({ min: 2, max: 5 }),
        async (change, n) => {
          // Store A: apply the change N times, chaining the returned version.
          const clientA = new FakeSupabaseClient({
            nurses: [{ id: 'nurse-1', tier: 'seed', pipeline_stage: 'screening', version: 1 }],
          });
          adapter.__setClientFactory(() => clientA);
          let version = 1;
          for (let i = 0; i < n; i += 1) {
            const res = await adapter.update('nurses', 'nurse-1', change, version);
            expect(res.error).toBeNull();
            expect(res.conflict).toBeUndefined();
            version = res.data.version;
          }
          const readA = await adapter.getById('nurses', 'nurse-1');

          // Store B: apply the same change exactly once.
          const clientB = new FakeSupabaseClient({
            nurses: [{ id: 'nurse-1', tier: 'seed', pipeline_stage: 'screening', version: 1 }],
          });
          adapter.__setClientFactory(() => clientB);
          const once = await adapter.update('nurses', 'nurse-1', change, 1);
          expect(once.error).toBeNull();
          const readB = await adapter.getById('nurses', 'nurse-1');

          // Business fields converge regardless of how many times applied.
          expect(businessFields(readA.data)).toEqual(businessFields(readB.data));
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});


// ---------------------------------------------------------------------------
// Feature: supabase-online-platform, Property 4: Mass-update atomic visibility and rollback
// Validates: Requirements 2.3, 11.5, 11.6
// NOTE: also run against a local Supabase/Postgres instance in CI (Task 13) to
// exercise the real bulk_update() RPC transaction and bump_version trigger.
// ---------------------------------------------------------------------------
describe('Property 4: Mass-update atomic visibility and rollback (fake-backed; also run vs. local Postgres in CI)', () => {
  it('on success a subsequent read shows ALL post-update values (never a partial mix)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // A random set of records, each with a fresh post-update value.
        fc.array(
          fc.record({ tier: fc.constantFrom('A', 'B', 'C'), next: fc.string({ minLength: 1, maxLength: 8 }) }),
          { minLength: 1, maxLength: 30 },
        ),
        async (specs) => {
          const seeded = specs.map((s, i) => ({
            id: `nurse-${i}`,
            tier: s.tier,
            version: 1,
          }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          // Every element carries the correct last-read version (1).
          const batch = specs.map((s, i) => ({
            id: `nurse-${i}`,
            version: 1,
            tier: s.next,
          }));

          const res = await adapter.bulkUpdate('nurses', batch);

          expect(res.error).toBeNull();
          expect(res.conflict).toBeUndefined();
          expect(res.data).toHaveLength(batch.length);

          // A subsequent read reflects ALL post-update values, versions bumped.
          for (let i = 0; i < specs.length; i += 1) {
            const read = await adapter.getById('nurses', `nurse-${i}`);
            expect(read.data.tier).toBe(specs[i].next);
            expect(read.data.version).toBe(2);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('on an injected mid-batch version mismatch, a read shows EVERY row at its pre-update value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({ tier: fc.constantFrom('A', 'B', 'C'), next: fc.string({ minLength: 1, maxLength: 8 }) }),
          { minLength: 2, maxLength: 30 },
        ),
        // Which element (by fraction) gets a stale version injected.
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        async (specs, frac) => {
          const seeded = specs.map((s, i) => ({
            id: `nurse-${i}`,
            tier: s.tier,
            version: 1,
          }));
          currentClient = new FakeSupabaseClient({ nurses: seeded });
          adapter.__setClientFactory(() => currentClient);

          const before = currentClient.snapshot('nurses');
          const badIndex = Math.min(specs.length - 1, Math.floor(frac * specs.length));

          const batch = specs.map((s, i) => ({
            id: `nurse-${i}`,
            // Inject a stale/mismatched version for exactly one mid-batch element.
            version: i === badIndex ? 999 : 1,
            tier: s.next,
          }));

          const res = await adapter.bulkUpdate('nurses', batch);

          // The batch is rejected as a conflict and commits nothing.
          expect(res.data).toBeNull();
          expect(res.error).toBeNull();
          expect(res.conflict).toBeDefined();
          expect(res.conflict.ids).toContain(`nurse-${badIndex}`);

          // No partial application: the store is byte-identical to before, and
          // every row still reads at its pre-update tier and version.
          const after = currentClient.snapshot('nurses');
          expect(after).toEqual(before);
          for (let i = 0; i < specs.length; i += 1) {
            const read = await adapter.getById('nurses', `nurse-${i}`);
            expect(read.data.tier).toBe(specs[i].tier);
            expect(read.data.version).toBe(1);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
