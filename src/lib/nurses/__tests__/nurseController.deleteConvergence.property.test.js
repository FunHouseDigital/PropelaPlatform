import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const NUM_RUNS = 100;
const CREATED_AT = '2026-03-10T12:00:00.000Z';
const UPDATED_AT = '2026-03-11T12:00:00.000Z';
const NAME_CHARACTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];

const safeNameArb = fc
  .array(fc.constantFrom(...NAME_CHARACTERS), { minLength: 1, maxLength: 40 })
  .map((characters) => characters.join(''));

const deleteScenarioArb = fc
  .record({
    ids: fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 }),
    targetIndexSeed: fc.nat(),
    targetName: safeNameArb,
    ownerId: fc.uuid(),
    baseVersion: fc.integer({ min: 1, max: 1_000_000 }),
    conflictAdvance: fc.integer({ min: 1, max: 1_000 }),
    reloadAdvance: fc.integer({ min: 1, max: 1_000 }),
    freshConflictAdvance: fc.integer({ min: 1, max: 1_000 }),
    duplicateConfirmations: fc.integer({ min: 1, max: 5 }),
    reloadOutcome: fc.constantFrom('found', 'notFound'),
    freshOutcome: fc.constantFrom('deleted', 'alreadyDeleted', 'conflict'),
    retryOutcome: fc.constantFrom('deleted', 'alreadyDeleted', 'conflict'),
  })
  .map((generated) => ({
    ...generated,
    targetIndex: generated.targetIndexSeed % generated.ids.length,
  }));

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function authoritativeNurse({ uuid, fullName, ownerId, version, updatedAt = CREATED_AT }) {
  const normalized = normalizeNurseCreateDraft({
    ...createBlankNurseDraft({
      now: new Date(CREATED_AT),
      randomUUID: () => uuid,
    }),
    fullName,
  });
  if (!normalized.valid) throw new Error('Generated nurse must be valid.');

  return {
    ...normalized.value,
    ownerId,
    version,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function buildNurses(generated) {
  return generated.ids.map((uuid, index) =>
    authoritativeNurse({
      uuid,
      fullName: index === generated.targetIndex ? generated.targetName : `Bystander${index}`,
      ownerId: generated.ownerId,
      version: index === generated.targetIndex ? generated.baseVersion : index + 1,
    }),
  );
}

function makeRepository(initialNurses, target, remove, reload = null) {
  let detailReadCount = 0;
  return {
    listAll: vi.fn(async () => ({
      status: 'ok',
      nurses: structuredClone(initialNurses),
      total: initialNurses.length,
    })),
    get: vi.fn((id, options) => {
      detailReadCount += 1;
      if (detailReadCount === 1) {
        return Promise.resolve(
          id === target.id
            ? { status: 'ok', nurse: structuredClone(target) }
            : { status: 'notFound' },
        );
      }
      return reload(id, options);
    }),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(remove),
  };
}

async function loadListAndDetail(controller, target) {
  await controller.refreshNurses();
  await controller.openNurse(target.id);
}

function expectTargetRetained(controller, initialNurses, selected) {
  expect(controller.getState()).toMatchObject({
    items: initialNurses,
    total: initialNurses.length,
    selectedId: selected.id,
    selected,
  });
}

function expectConverged(controller, initialNurses, target, status) {
  const alreadyDeleted = status === 'alreadyDeleted';
  expect(controller.getState()).toMatchObject({
    items: initialNurses.filter((nurse) => nurse.id !== target.id),
    total: initialNurses.length - 1,
    selectedId: null,
    selected: null,
    detailState: NurseAsyncState.IDLE,
    deleteState: NurseAsyncState.SUCCESS,
    deleteError: null,
    deleteDecision: null,
    notice: {
      type: alreadyDeleted ? 'alreadyDeleted' : 'deleted',
      message: alreadyDeleted ? 'This nurse was already deleted.' : 'Nurse deleted.',
    },
  });
}

function startDelete(controller, repository, target, duplicateConfirmations) {
  expect(controller.requestDelete()).toBe(true);
  expect(controller.getState().deleteDecision).toMatchObject({
    type: 'confirmDelete',
    id: target.id,
    baseVersion: target.version,
  });

  const pending = controller.confirmDelete();
  for (let index = 0; index < duplicateConfirmations; index += 1) {
    expect(controller.confirmDelete()).toBe(pending);
  }

  expect(controller.requestDelete()).toBe(false);
  expect(controller.cancelDelete()).toBe(false);
  expect(repository.remove).toHaveBeenCalledTimes(1);
  expect(repository.remove).toHaveBeenLastCalledWith(target.id, target.version, {
    retryCount: 0,
  });
  expect(controller.getState()).toMatchObject({
    deleteState: NurseAsyncState.LOADING,
    selectedId: target.id,
    selected: target,
  });
  return pending;
}

async function assertDirectConvergence(generated, status) {
  const initialNurses = buildNurses(generated);
  const target = initialNurses[generated.targetIndex];
  const gate = deferred();
  const repository = makeRepository(initialNurses, target, () => gate.promise);
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);

  const pending = startDelete(
    controller,
    repository,
    target,
    generated.duplicateConfirmations,
  );
  expectTargetRetained(controller, initialNurses, target);

  gate.resolve({ status });
  await pending;

  expectConverged(controller, initialNurses, target, status);
  expect(repository.remove).toHaveBeenCalledTimes(1);
}

async function assertRecoverableFailure(generated) {
  const initialNurses = buildNurses(generated);
  const target = initialNurses[generated.targetIndex];
  const firstGate = deferred();
  const retryGate = deferred();
  const repository = makeRepository(
    initialNurses,
    target,
    vi.fn().mockImplementationOnce(() => firstGate.promise).mockImplementationOnce(() => retryGate.promise),
  );
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);

  const pending = startDelete(
    controller,
    repository,
    target,
    generated.duplicateConfirmations,
  );
  firstGate.resolve({ status: 'error', error: new DataError(DataErrorCode.NETWORK) });
  await pending;

  expectTargetRetained(controller, initialNurses, target);
  expect(controller.getState()).toMatchObject({
    deleteState: NurseAsyncState.ERROR,
    deleteError: { code: DataErrorCode.NETWORK },
    deleteDecision: { type: 'deleteFailure', retryAvailable: true },
  });
  expect(repository.remove).toHaveBeenCalledTimes(1);

  const retry = controller.retryDelete();
  expect(controller.confirmDelete()).toBe(retry);
  expect(repository.remove).toHaveBeenCalledTimes(2);
  expect(repository.remove).toHaveBeenLastCalledWith(target.id, target.version, {
    retryCount: 1,
  });
  expectTargetRetained(controller, initialNurses, target);

  const retryCurrent = {
    ...target,
    version: target.version + generated.conflictAdvance,
    updatedAt: UPDATED_AT,
  };
  retryGate.resolve(
    generated.retryOutcome === 'conflict'
      ? { status: 'conflict', current: retryCurrent }
      : { status: generated.retryOutcome },
  );
  await retry;

  if (generated.retryOutcome === 'conflict') {
    expectTargetRetained(controller, initialNurses, target);
    expect(controller.getState().deleteDecision).toMatchObject({
      type: 'deleteConflict',
      current: retryCurrent,
      retryAvailable: false,
      requiresReload: true,
    });
  } else {
    expectConverged(controller, initialNurses, target, generated.retryOutcome);
  }
}

async function assertConflictReloadAndFreshConfirmation(generated) {
  const initialNurses = buildNurses(generated);
  const target = initialNurses[generated.targetIndex];
  const conflictCurrent = {
    ...target,
    fullName: `${generated.targetName}Conflict`,
    version: target.version + generated.conflictAdvance,
    updatedAt: UPDATED_AT,
  };
  const reloaded = {
    ...conflictCurrent,
    fullName: `${generated.targetName}Reloaded`,
    version: conflictCurrent.version + generated.reloadAdvance,
  };
  const firstGate = deferred();
  const reloadGate = deferred();
  const freshGate = deferred();
  const repository = makeRepository(
    initialNurses,
    target,
    vi.fn().mockImplementationOnce(() => firstGate.promise).mockImplementationOnce(() => freshGate.promise),
    () => reloadGate.promise,
  );
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);

  const pending = startDelete(
    controller,
    repository,
    target,
    generated.duplicateConfirmations,
  );
  firstGate.resolve({ status: 'conflict', current: conflictCurrent });
  await pending;

  expectTargetRetained(controller, initialNurses, target);
  expect(controller.getState()).toMatchObject({
    detailState: NurseAsyncState.SUCCESS,
    deleteState: NurseAsyncState.ERROR,
    deleteError: null,
    deleteDecision: {
      type: 'deleteConflict',
      id: target.id,
      current: conflictCurrent,
      retryAvailable: false,
      requiresReload: true,
    },
  });

  await controller.retryDelete();
  await controller.confirmDelete();
  expect(repository.remove).toHaveBeenCalledTimes(1);

  const reload = controller.reloadAfterDeleteConflict();
  expect(repository.get).toHaveBeenCalledTimes(2);
  expect(repository.get).toHaveBeenLastCalledWith(target.id, { retryCount: 1 });
  expect(repository.remove).toHaveBeenCalledTimes(1);
  expect(controller.getState()).toMatchObject({
    detailState: NurseAsyncState.LOADING,
    deleteDecision: null,
  });

  if (generated.reloadOutcome === 'notFound') {
    reloadGate.resolve({ status: 'notFound' });
    await reload;
    expectConverged(controller, initialNurses, target, 'alreadyDeleted');
    expect(repository.remove).toHaveBeenCalledTimes(1);
    return;
  }

  reloadGate.resolve({ status: 'ok', nurse: reloaded });
  await reload;
  expectTargetRetained(controller, initialNurses, reloaded);
  expect(controller.getState()).toMatchObject({
    originalBase: reloaded,
    draft: reloaded,
    baseVersion: reloaded.version,
    deleteDecision: null,
  });

  await controller.confirmDelete();
  expect(repository.remove).toHaveBeenCalledTimes(1);
  expect(controller.requestDelete()).toBe(true);
  expect(controller.getState().deleteDecision).toMatchObject({
    type: 'confirmDelete',
    id: target.id,
    baseVersion: reloaded.version,
  });

  const freshPending = controller.confirmDelete();
  for (let index = 0; index < generated.duplicateConfirmations; index += 1) {
    expect(controller.confirmDelete()).toBe(freshPending);
  }
  expect(repository.remove).toHaveBeenCalledTimes(2);
  expect(repository.remove).toHaveBeenLastCalledWith(target.id, reloaded.version, {
    retryCount: 0,
  });

  const freshConflict = {
    ...reloaded,
    version: reloaded.version + generated.freshConflictAdvance,
  };
  freshGate.resolve(
    generated.freshOutcome === 'conflict'
      ? { status: 'conflict', current: freshConflict }
      : { status: generated.freshOutcome },
  );
  await freshPending;

  if (generated.freshOutcome === 'conflict') {
    expectTargetRetained(controller, initialNurses, reloaded);
    expect(controller.getState().deleteDecision).toMatchObject({
      type: 'deleteConflict',
      current: freshConflict,
      retryAvailable: false,
      requiresReload: true,
    });
  } else {
    expectConverged(controller, initialNurses, target, generated.freshOutcome);
  }
}

describe('Property 13: Delete outcome convergence and fresh stale retry', () => {
  // **Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.12, 7.13, 7.14, 7.15**
  it('deduplicates confirmations and converges only confirmed outcomes through reload and fresh versioned confirmation', async () => {
    await fc.assert(
      fc.asyncProperty(deleteScenarioArb, async (generated) => {
        await assertDirectConvergence(generated, 'deleted');
        await assertDirectConvergence(generated, 'alreadyDeleted');
        await assertRecoverableFailure(generated);
        await assertConflictReloadAndFreshConfirmation(generated);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
