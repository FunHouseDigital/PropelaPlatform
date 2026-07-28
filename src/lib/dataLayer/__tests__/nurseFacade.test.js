import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const makeAdapter = (backend) => ({
    listNurses: vi.fn(async () => ({ data: [], error: null, backend })),
    getNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    createNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    updateNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    deleteNurse: vi.fn(async () => ({ error: null, backend })),
    list: vi.fn(async () => ({ data: [], error: null, backend })),
    getById: vi.fn(async () => ({ data: null, error: null, backend })),
    create: vi.fn(async () => ({ data: null, error: null, backend })),
    update: vi.fn(async () => ({ data: null, error: null, backend })),
    remove: vi.fn(async () => ({ error: null, backend })),
    bulkUpsert: vi.fn(async () => ({ data: [], error: null, backend })),
    bulkUpdate: vi.fn(async () => ({ data: [], error: null, backend })),
    getCollection: vi.fn(async () => ({ data: [], error: null, backend })),
    saveCollection: vi.fn(async (_name, value) => ({ data: value, error: null, backend })),
  });

  return {
    flagRef: { value: false },
    storageAdapter: makeAdapter('storage'),
    supabaseAdapter: makeAdapter('supabase'),
  };
});

vi.mock('../../featureFlags', () => ({
  isFeatureEnabled: (name) =>
    name === 'SUPABASE_BACKEND' ? h.flagRef.value : false,
}));

vi.mock('../storageAdapter', () => h.storageAdapter);
vi.mock('../supabaseAdapter', () => h.supabaseAdapter);

function totalCalls(adapter) {
  return Object.values(adapter).reduce(
    (count, operation) => count + operation.mock.calls.length,
    0,
  );
}

beforeEach(() => {
  h.flagRef.value = false;
  vi.clearAllMocks();
  vi.resetModules();
});

describe.each([
  ['legacy mode', false, 'storage', 'supabase'],
  ['Supabase mode', true, 'supabase', 'storage'],
])('nurse facade bindings in %s', (_label, flag, selectedName, unselectedName) => {
  it('routes every explicit record operation to the module-selected adapter', async () => {
    h.flagRef.value = flag;
    const facade = await import('../index.js');
    const selected = h[`${selectedName}Adapter`];
    const unselected = h[`${unselectedName}Adapter`];
    const pipelineChanges = {
      pipelineStage: 'Screening',
      readinessStatus: 'In Progress',
    };

    await facade.listNurses({ page: 2, pageSize: 100 });
    await facade.getNurse('nurse-1');
    await facade.createNurse({ id: 'nurse-2' });
    await facade.updateNurse('nurse-1', { fullName: 'Updated' }, 4);
    await facade.changeNursePipeline('nurse-1', pipelineChanges, 5);
    await facade.deleteNurse('nurse-1', 6);

    expect(selected.listNurses).toHaveBeenCalledWith({
      page: 2,
      pageSize: 100,
    });
    expect(selected.getNurse).toHaveBeenCalledWith('nurse-1');
    expect(selected.createNurse).toHaveBeenCalledWith({ id: 'nurse-2' });
    expect(selected.updateNurse).toHaveBeenNthCalledWith(
      1,
      'nurse-1',
      { fullName: 'Updated' },
      4,
    );
    expect(selected.updateNurse).toHaveBeenNthCalledWith(
      2,
      'nurse-1',
      pipelineChanges,
      5,
    );
    expect(selected.deleteNurse).toHaveBeenCalledWith('nurse-1', 6);
    expect(totalCalls(unselected)).toBe(0);
  });
});

describe('nurse facade isolation and compatibility', () => {
  it('retains the initialized adapter after a failure and later flag change', async () => {
    const failure = { code: 'NETWORK', message: 'Unavailable' };
    h.storageAdapter.listNurses.mockResolvedValueOnce({
      data: [],
      error: failure,
      page: 1,
      pageSize: 100,
      total: 0,
    });

    const facade = await import('../index.js');
    const failed = await facade.listNurses({ pageSize: 100 });
    h.flagRef.value = true;
    await facade.getNurse('nurse-1');

    expect(failed.error).toBe(failure);
    expect(h.storageAdapter.listNurses).toHaveBeenCalledTimes(1);
    expect(h.storageAdapter.getNurse).toHaveBeenCalledTimes(1);
    expect(totalCalls(h.supabaseAdapter)).toBe(0);
  });

  it('exposes a frozen record-only nurse API without whole-collection writes', async () => {
    const facade = await import('../index.js');

    expect(Object.isFrozen(facade.nurseOps)).toBe(true);
    expect(Object.keys(facade.nurseOps)).toEqual([
      'list',
      'get',
      'create',
      'update',
      'changePipeline',
      'remove',
    ]);
    expect(facade.nurseOps.saveAll).toBeUndefined();
    expect(facade.nurseOps.saveNurses).toBeUndefined();
  });

  it('retains existing whole-collection compatibility APIs outside nurseOps', async () => {
    const facade = await import('../index.js');
    const nurses = [{ id: 'legacy-nurse' }];

    await facade.saveCollection('nurses', nurses);
    await facade.perDomain.saveNurses(nurses);
    await facade.domainOps.nurses.saveAll(nurses);

    expect(h.storageAdapter.saveCollection).toHaveBeenCalledTimes(3);
    expect(h.storageAdapter.saveCollection).toHaveBeenNthCalledWith(
      1,
      'nurses',
      nurses,
    );
    expect(h.storageAdapter.saveCollection).toHaveBeenNthCalledWith(
      2,
      'nurses',
      nurses,
    );
    expect(h.storageAdapter.saveCollection).toHaveBeenNthCalledWith(
      3,
      'nurses',
      nurses,
    );
  });
});
