import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Final cross-load regression for independent nurse stores.
 *
 * **Validates: Requirements 10.1, 10.7, 10.8, 10.9**
 */
const h = vi.hoisted(() => {
  const stores = {
    storage: [{ id: 'local-only', fullName: 'Local Nurse' }],
    supabase: [{ id: 'remote-only', fullName: 'Remote Nurse' }],
  };

  const makeAdapter = (backend) => ({
    listNurses: vi.fn(async () => ({
      data: structuredClone(stores[backend]),
      error: null,
      page: 1,
      pageSize: 100,
      total: stores[backend].length,
    })),
    getNurse: vi.fn(async (id) => ({
      data: structuredClone(stores[backend].find((nurse) => nurse.id === id) ?? null),
      error: null,
    })),
    createNurse: vi.fn(async (nurse) => {
      stores[backend] = [...stores[backend], structuredClone(nurse)];
      return { data: structuredClone(nurse), error: null };
    }),
    updateNurse: vi.fn(async () => ({ data: null, error: null })),
    deleteNurse: vi.fn(async () => ({ error: null })),
    list: vi.fn(async () => ({ data: [], error: null, total: 0 })),
    getById: vi.fn(async () => ({ data: null, error: null })),
    create: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(async () => ({ data: null, error: null })),
    remove: vi.fn(async () => ({ error: null })),
    bulkUpsert: vi.fn(async () => ({ data: [], error: null })),
    bulkUpdate: vi.fn(async () => ({ data: [], error: null })),
    getCollection: vi.fn(async () => ({ data: [], error: null })),
    saveCollection: vi.fn(async (_name, value) => ({ data: value, error: null })),
  });

  return {
    flag: { value: false },
    stores,
    storageAdapter: makeAdapter('storage'),
    supabaseAdapter: makeAdapter('supabase'),
  };
});

vi.mock('../../featureFlags', () => ({
  isFeatureEnabled: (name) => name === 'SUPABASE_BACKEND' && h.flag.value,
}));
vi.mock('../storageAdapter', () => h.storageAdapter);
vi.mock('../supabaseAdapter', () => h.supabaseAdapter);

async function loadFacade(useSupabase) {
  h.flag.value = useSupabase;
  vi.resetModules();
  return import('../index.js');
}

beforeEach(() => {
  h.flag.value = false;
  h.stores.storage = [{ id: 'local-only', fullName: 'Local Nurse' }];
  h.stores.supabase = [{ id: 'remote-only', fullName: 'Remote Nurse' }];
  vi.clearAllMocks();
  vi.resetModules();
});

describe('nurse feature-mode store independence', () => {
  it('never copies, merges, or reconciles nurse stores across mode changes', async () => {
    const legacyFacade = await loadFacade(false);
    await legacyFacade.createNurse({
      id: 'local-created',
      fullName: 'Created Locally',
    });

    expect((await legacyFacade.listNurses({ pageSize: 100 })).data).toEqual([
      { id: 'local-only', fullName: 'Local Nurse' },
      { id: 'local-created', fullName: 'Created Locally' },
    ]);
    expect(h.stores.supabase).toEqual([{ id: 'remote-only', fullName: 'Remote Nurse' }]);

    // Changing the flag cannot switch the adapter in the current load.
    h.flag.value = true;
    expect((await legacyFacade.listNurses({ pageSize: 100 })).data).toEqual(h.stores.storage);

    // A new Supabase-mode load sees only the remote store.
    const supabaseFacade = await loadFacade(true);
    expect((await supabaseFacade.listNurses({ pageSize: 100 })).data).toEqual([
      { id: 'remote-only', fullName: 'Remote Nurse' },
    ]);
    await supabaseFacade.createNurse({
      id: 'remote-created',
      fullName: 'Created Remotely',
    });

    expect(h.stores.storage).toEqual([
      { id: 'local-only', fullName: 'Local Nurse' },
      { id: 'local-created', fullName: 'Created Locally' },
    ]);

    // Rolling back in another load restores the untouched local collection;
    // neither remote record is copied into it.
    const rollbackFacade = await loadFacade(false);
    expect((await rollbackFacade.listNurses({ pageSize: 100 })).data).toEqual(h.stores.storage);
    expect(h.stores.storage.map(({ id }) => id)).not.toContain('remote-only');
    expect(h.stores.storage.map(({ id }) => id)).not.toContain('remote-created');
    expect(h.stores.supabase.map(({ id }) => id)).not.toContain('local-only');
    expect(h.stores.supabase.map(({ id }) => id)).not.toContain('local-created');
  });
});
