import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

/**
 * Task 2.5 — Property-based test for adapter routing mutual exclusion.
 *
 * Feature: supabase-online-platform, Property 6: Adapter routing mutual exclusion
 *
 * For any sequence of Data_Layer operations, when SUPABASE_BACKEND is disabled
 * only the legacy storage adapter is invoked (the Supabase adapter is never
 * called), and when enabled only the Supabase adapter is invoked (the legacy
 * adapter is never called).
 *
 * **Validates: Requirements 9.1, 9.2**
 *
 * Strategy: mock the feature flag (controllable per run), mock both adapters
 * with call-recording spies, and — because the facade reads the flag once at
 * module init — reset the module registry and re-import the facade fresh for
 * each generated flag value before replaying a random op sequence.
 */

const h = vi.hoisted(() => {
  const makeAdapter = () => ({
    list: vi.fn(async () => ({ data: [], error: null, page: 1, pageSize: 25, total: 0 })),
    getById: vi.fn(async () => ({ data: null, error: null })),
    create: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(async () => ({ data: null, error: null })),
    remove: vi.fn(async () => ({ error: null })),
    bulkUpsert: vi.fn(async () => ({ data: [], error: null })),
    getCollection: vi.fn(async () => ({ data: [], error: null })),
    saveCollection: vi.fn(async () => ({ data: null, error: null })),
  });
  return {
    flagRef: { value: false },
    storageMock: makeAdapter(),
    supabaseMock: makeAdapter(),
  };
});

vi.mock('../../featureFlags', () => ({
  isFeatureEnabled: (name) =>
    name === 'SUPABASE_BACKEND' ? h.flagRef.value : false,
  FEATURE_FLAGS: { SUPABASE_BACKEND: 'SUPABASE_BACKEND' },
}));

vi.mock('../storageAdapter', () => h.storageMock);
vi.mock('../supabaseAdapter', () => h.supabaseMock);

// Operations to exercise, spanning reads and writes across domains.
const OPS = [
  (dl) => dl.list('nurses', { page: 1 }),
  (dl) => dl.getById('nurses', 'nurse-001'),
  (dl) => dl.create('nurses', { id: 'nurse-x' }),
  (dl) => dl.update('nurses', 'nurse-001', { tier: 'A' }, 1),
  (dl) => dl.remove('placements', 'placement-001', 2),
  (dl) => dl.bulkUpsert('facilities', [{ id: 'uk-001' }]),
  (dl) => dl.getCollection('settings'),
  (dl) => dl.saveCollection('cohorts', []),
];

function totalCalls(adapterMock) {
  return Object.values(adapterMock).reduce(
    (sum, fn) => sum + fn.mock.calls.length,
    0,
  );
}

describe('dataLayer/index routing (Property 6)', () => {
  it('invokes only the flagged adapter across arbitrary op sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.array(fc.integer({ min: 0, max: OPS.length - 1 }), {
          minLength: 1,
          maxLength: 20,
        }),
        async (flag, opIndexes) => {
          h.flagRef.value = flag;
          vi.clearAllMocks();
          vi.resetModules();

          const dl = await import('../index.js');
          for (const idx of opIndexes) {
            await OPS[idx](dl);
          }

          const active = flag ? h.supabaseMock : h.storageMock;
          const inactive = flag ? h.storageMock : h.supabaseMock;

          // The inactive adapter must never be touched.
          expect(totalCalls(inactive)).toBe(0);
          // Every op routed to the active adapter exactly once.
          expect(totalCalls(active)).toBe(opIndexes.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
