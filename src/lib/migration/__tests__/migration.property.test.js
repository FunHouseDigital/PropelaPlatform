import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { FakeSupabaseClient } from '../../dataLayer/__tests__/fakeSupabase';
import { getDomain } from '../../dataLayer/domains';
import { runMigration } from '../engine';
import { sourceIds } from '../transform';

/**
 * Task 11.4 — Property-based test for migration round-trip identity preservation.
 *
 * Feature: supabase-online-platform, Property 5: Migration round-trip identity preservation
 *
 * For any seed dataset, running the migration (once or repeatedly) yields, per
 * Data_Domain, a migrated row set whose IDs are in one-to-one correspondence
 * with the source records — equal counts, distinct identities, zero duplicates,
 * and zero omissions; and running twice leaves the set unchanged.
 *
 * **Validates: Requirements 5.2, 5.3, 5.8, 11.7**
 *
 * Strategy: generate randomized datasets (varying sizes, including empty, with
 * cross-domain references from placements/documents to nurses/facilities) for
 * the core collection domains, run the pure engine against an in-memory fake
 * store (no live DB), and assert the id-set bijection, count equality, and
 * idempotence of a second run.
 */

const CORE_DOMAINS = ['nurses', 'facilities', 'cohorts', 'placements', 'documents'];

/** Arbitrary array of unique ids for a domain, sizes 0..12 (includes empty). */
function uniqueIds(prefix) {
  return fc
    .uniqueArray(fc.integer({ min: 1, max: 99999 }), { minLength: 0, maxLength: 12 })
    .map((nums) => nums.map((n) => `${prefix}-${String(n).padStart(3, '0')}`));
}

/** Build a randomized, cross-referential seed dataset for the core domains. */
const datasetArb = fc
  .record({
    nurseIds: uniqueIds('nurse'),
    facilityIds: uniqueIds('facility'),
    cohortIds: uniqueIds('cohort'),
    placementIds: uniqueIds('placement'),
    documentIds: uniqueIds('doc'),
    picks: fc.array(fc.nat(), { minLength: 0, maxLength: 24 }),
  })
  .map(({ nurseIds, facilityIds, cohortIds, placementIds, documentIds, picks }) => {
    const refOr = (arr, i, fallback) =>
      arr.length > 0 ? arr[picks[i % picks.length] % arr.length] : fallback;

    return {
      nurses: nurseIds.map((id) => ({ id, fullName: `Nurse ${id}`, pipelineStage: 'Applied' })),
      facilities: facilityIds.map((id) => ({ id, organisationName: `Facility ${id}`, province: 'Gauteng' })),
      cohorts: cohortIds.map((id) => ({ id, name: `Cohort ${id}`, status: 'Training' })),
      placements: placementIds.map((id, i) => ({
        id,
        // cross-domain references (may be null when no nurses/facilities exist)
        nurseId: refOr(nurseIds, i, null),
        facilityId: refOr(facilityIds, i + 1, null),
        currentStage: 'CV Sent',
        contractDetails: { role: 'ICU Nurse' },
      })),
      documents: documentIds.map((id, i) => ({
        id,
        nurseId: refOr(nurseIds, i, null),
        type: 'Passport',
        status: 'Pending',
      })),
    };
  });

function idSet(rows) {
  return new Set(rows.map((r) => r.id));
}

describe('migration engine (Property 5: round-trip identity preservation)', () => {
  it('preserves the id set per domain and is idempotent across re-runs', async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, async (sources) => {
        const client = new FakeSupabaseClient();

        const first = await runMigration({ client, sources });

        for (const name of CORE_DOMAINS) {
          const domain = getDomain(name);
          const expectedIds = sourceIds(domain, sources[name]);
          const expectedSet = new Set(expectedIds);
          const migrated = client.snapshot(domain.table);

          // Equal counts + zero duplicates + zero omissions (bijection).
          expect(migrated.length).toBe(expectedIds.length);
          expect(idSet(migrated)).toEqual(expectedSet);

          // Per-domain report reflects a full load with no failures.
          const result = first.domains.find((d) => d.domain === name);
          expect(result.loadedCount).toBe(result.sourceCount);
          expect(result.failedCount).toBe(0);
        }

        // No count mismatch anywhere ⇒ migration succeeds.
        expect(first.failed).toBe(false);

        // Idempotence: a second run leaves each domain's id set unchanged and
        // creates no duplicates (Req 5.8, 11.7).
        const before = CORE_DOMAINS.map((name) =>
          idSet(client.snapshot(getDomain(name).table)),
        );
        const second = await runMigration({ client, sources });
        expect(second.failed).toBe(false);

        CORE_DOMAINS.forEach((name, i) => {
          const after = client.snapshot(getDomain(name).table);
          expect(after.length).toBe(before[i].size);
          expect(idSet(after)).toEqual(before[i]);
        });
      }),
      { numRuns: 100 },
    );
  });
});
