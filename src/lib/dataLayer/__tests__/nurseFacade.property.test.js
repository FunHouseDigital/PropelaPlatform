import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

/**
 * Property 2: Immutable adapter exclusivity
 *
 * For any nurse-operation sequence within one application load, only the
 * adapter selected when the facade module initializes receives calls. Returned
 * failures, rejected operations, and later feature-flag changes cannot route a
 * subsequent operation to the other adapter.
 *
 * **Validates: Requirements 1.1, 1.2, 1.6, 10.1, 10.7**
 */

const h = vi.hoisted(() => {
  const makeAdapter = (backend) => ({
    listNurses: vi.fn(async () => ({ data: [], error: null, total: 0, backend })),
    getNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    createNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    updateNurse: vi.fn(async () => ({ data: null, error: null, backend })),
    deleteNurse: vi.fn(async () => ({ error: null, backend })),
    list: vi.fn(async () => ({ data: [], error: null, total: 0, backend })),
    getById: vi.fn(async () => ({ data: null, error: null, backend })),
    create: vi.fn(async () => ({ data: null, error: null, backend })),
    update: vi.fn(async () => ({ data: null, error: null, backend })),
    remove: vi.fn(async () => ({ error: null, backend })),
    bulkUpsert: vi.fn(async () => ({ data: [], error: null, backend })),
    bulkUpdate: vi.fn(async () => ({ data: [], error: null, backend })),
    getCollection: vi.fn(async () => ({ data: [], error: null, backend })),
    saveCollection: vi.fn(async (_name, value) => ({
      data: value,
      error: null,
      backend,
    })),
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

const operationArbitrary = fc
  .array(
    fc.record({
      type: fc.constantFrom(
        'list',
        'detail',
        'create',
        'update',
        'pipeline',
        'delete',
        'refresh',
      ),
      id: fc.uuid().map((uuid) => `nurse-${uuid}`),
      baseVersion: fc.integer({ min: 1, max: 10_000 }),
      outcome: fc.constantFrom('success', 'error', 'throw'),
      laterFlag: fc.boolean(),
    }),
    { minLength: 1, maxLength: 20 },
  )
  // Every generated sequence includes a failure path, rather than relying on
  // chance to cover one within the configured run count.
  .map(([first, ...rest]) => [{ ...first, outcome: 'error' }, ...rest]);

const adapterMethodByOperation = {
  list: 'listNurses',
  detail: 'getNurse',
  create: 'createNurse',
  update: 'updateNurse',
  pipeline: 'updateNurse',
  delete: 'deleteNurse',
  refresh: 'listNurses',
};

function totalCalls(adapter) {
  return Object.values(adapter).reduce(
    (count, operation) => count + operation.mock.calls.length,
    0,
  );
}

function failedResult(type) {
  const error = { code: 'NETWORK', message: 'Generated adapter failure' };
  if (type === 'delete') return { error };
  if (type === 'list' || type === 'refresh') {
    return { data: [], error, page: 1, pageSize: 100, total: 0 };
  }
  return { data: null, error };
}

function invokeOperation(facade, operation) {
  const { type, id, baseVersion } = operation;
  switch (type) {
    case 'list':
      return facade.listNurses({ page: 2, pageSize: 100 });
    case 'detail':
      return facade.getNurse(id);
    case 'create':
      return facade.createNurse({ id, fullName: 'Generated Nurse' });
    case 'update':
      return facade.updateNurse(id, { fullName: 'Updated Nurse' }, baseVersion);
    case 'pipeline':
      return facade.changeNursePipeline(
        id,
        { pipelineStage: 'Screening', readinessStatus: 'In Progress' },
        baseVersion,
      );
    case 'delete':
      return facade.deleteNurse(id, baseVersion);
    case 'refresh':
      return facade.listNurses({ page: 1, pageSize: 100 });
    default:
      throw new Error(`Unsupported generated operation: ${type}`);
  }
}

async function exerciseSequence(initialFlag, operations) {
  h.flagRef.value = initialFlag;
  vi.clearAllMocks();
  vi.resetModules();

  const facade = await import('../index.js');
  const selected = initialFlag ? h.supabaseAdapter : h.storageAdapter;
  const unselected = initialFlag ? h.storageAdapter : h.supabaseAdapter;
  const expectedCalls = {
    listNurses: 0,
    getNurse: 0,
    createNurse: 0,
    updateNurse: 0,
    deleteNurse: 0,
  };

  // Guarantee at least one post-initialization flag change in every generated
  // case. Per-operation generated changes then exercise arbitrary later values.
  h.flagRef.value = !initialFlag;

  for (const operation of operations) {
    h.flagRef.value = operation.laterFlag;
    const methodName = adapterMethodByOperation[operation.type];
    const method = selected[methodName];
    expectedCalls[methodName] += 1;

    if (operation.outcome === 'error') {
      method.mockResolvedValueOnce(failedResult(operation.type));
    } else if (operation.outcome === 'throw') {
      method.mockRejectedValueOnce(new Error('Generated adapter rejection'));
    }

    try {
      await invokeOperation(facade, operation);
    } catch (error) {
      expect(operation.outcome).toBe('throw');
      expect(error).toBeInstanceOf(Error);
    }
  }

  expect(selected.listNurses).toHaveBeenCalledTimes(expectedCalls.listNurses);
  expect(selected.getNurse).toHaveBeenCalledTimes(expectedCalls.getNurse);
  expect(selected.createNurse).toHaveBeenCalledTimes(expectedCalls.createNurse);
  expect(selected.updateNurse).toHaveBeenCalledTimes(expectedCalls.updateNurse);
  expect(selected.deleteNurse).toHaveBeenCalledTimes(expectedCalls.deleteNurse);
  expect(totalCalls(selected)).toBe(operations.length);
  expect(totalCalls(unselected)).toBe(0);
}

describe.each([
  ['Legacy mode', false],
  ['Supabase mode', true],
])('nurse facade Property 2 in %s', (_label, initialFlag) => {
  it('keeps every generated operation on the module-selected adapter', async () => {
    await fc.assert(
      fc.asyncProperty(operationArbitrary, async (operations) => {
        await exerciseSequence(initialFlag, operations);
      }),
      { numRuns: 100 },
    );
  });
});
