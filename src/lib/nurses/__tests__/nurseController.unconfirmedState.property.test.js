import { describe, expect, it } from 'vitest';

import { assertAsyncProperty, fc } from '../../../test/pbt';
import { calculateReadinessStatus } from '../../calculations';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const CREATED_AT = '2026-03-10T12:00:00.000Z';
const UPDATED_AT = '2026-03-11T12:00:00.000Z';
const NAME_CHARACTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];
const ERROR_CODES = [
  DataErrorCode.NETWORK,
  DataErrorCode.AUTH,
  DataErrorCode.FORBIDDEN,
  DataErrorCode.VALIDATION,
  DataErrorCode.STORAGE,
  DataErrorCode.UNKNOWN,
];

const CREATE_OUTCOMES = [...ERROR_CODES.map((code) => `error:${code}`), 'collision', 'saved'];
const SAVE_OUTCOMES = [
  ...ERROR_CODES.map((code) => `error:${code}`),
  'conflict',
  'notFound',
  'saved',
];
const DELETE_OUTCOMES = [
  ...ERROR_CODES.map((code) => `error:${code}`),
  'conflict',
  'deleted',
  'alreadyDeleted',
];

const safeNameArbitrary = fc
  .array(fc.constantFrom(...NAME_CHARACTERS), { minLength: 1, maxLength: 32 })
  .map((characters) => characters.join(''));

const generatedCaseArbitrary = fc.record({
  ids: fc.uniqueArray(fc.uuid(), { minLength: 3, maxLength: 6 }),
  targetName: safeNameArbitrary,
  createName: safeNameArbitrary,
  baseVersion: fc.integer({ min: 1, max: 1_000_000 }),
  listErrorCode: fc.constantFrom(...ERROR_CODES),
  createOutcome: fc.constantFrom(...CREATE_OUTCOMES),
  saveOutcome: fc.constantFrom(...SAVE_OUTCOMES),
  pipelineOutcome: fc.constantFrom(...SAVE_OUTCOMES),
  deleteOutcome: fc.constantFrom(...DELETE_OUTCOMES),
});

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function authoritativeNurse({ id, fullName, version, overrides = {} }) {
  const normalized = normalizeNurseCreateDraft({
    ...createBlankNurseDraft({
      now: new Date(CREATED_AT),
      randomUUID: () => id,
    }),
    fullName,
  });
  if (!normalized.valid) throw new Error('Generated nurse must be valid.');

  return {
    ...normalized.value,
    ownerId: id,
    version,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildNurses(generated) {
  return generated.ids.slice(0, -1).map((id, index) =>
    authoritativeNurse({
      id,
      fullName: index === 0 ? generated.targetName : `Bystander${index}`,
      version: index === 0 ? generated.baseVersion : index + 1,
    })
  );
}

function createRecordingRepository(initialNurses, detailNurse, overrides = {}) {
  const calls = {
    listAll: [],
    get: [],
    create: [],
    save: [],
    remove: [],
  };
  const handlers = {
    listAll: async () => ({
      status: 'ok',
      nurses: structuredClone(initialNurses),
      total: initialNurses.length,
    }),
    get: async (id) =>
      id === detailNurse.id
        ? { status: 'ok', nurse: structuredClone(detailNurse) }
        : { status: 'notFound' },
    create: async () => {
      throw new Error('Unexpected create call.');
    },
    save: async () => {
      throw new Error('Unexpected save call.');
    },
    remove: async () => {
      throw new Error('Unexpected remove call.');
    },
    ...overrides,
  };

  const repository = Object.fromEntries(
    Object.entries(handlers).map(([method, handler]) => [
      method,
      (...args) => {
        calls[method].push(structuredClone(args));
        return handler(...args);
      },
    ])
  );

  return { repository, calls };
}

function committedSnapshot(state) {
  return structuredClone({
    items: state.items,
    total: state.total,
    hasAcceptedList: state.hasAcceptedList,
    selectedId: state.selectedId,
    selected: state.selected,
    originalBase: state.originalBase,
    baseVersion: state.baseVersion,
  });
}

function expectCommittedState(controller, expected) {
  expect(committedSnapshot(controller.getState())).toEqual(expected);
}

async function loadListAndDetail(controller, target) {
  await controller.refreshNurses();
  await controller.openNurse(target.id);
}

function errorResult(code) {
  return {
    label: `error:${code}`,
    result: { status: 'error', error: new DataError(code) },
  };
}

async function assertListFailureIsolation(initialNurses, target, errorCode) {
  const gate = deferred();
  let requestNumber = 0;
  const { repository } = createRecordingRepository(initialNurses, target, {
    listAll: async () => {
      requestNumber += 1;
      return requestNumber === 1
        ? {
            status: 'ok',
            nurses: structuredClone(initialNurses),
            total: initialNurses.length,
          }
        : gate.promise;
    },
  });
  const controller = createNurseController({ repository });
  await controller.refreshNurses();
  const before = committedSnapshot(controller.getState());

  const pending = controller.refreshNurses();
  expectCommittedState(controller, before);

  gate.resolve({ status: 'error', error: new DataError(errorCode) });
  await pending;

  expectCommittedState(controller, before);
  expect(controller.getState()).toMatchObject({
    listState: NurseAsyncState.ERROR,
    staleWarning: true,
  });
}

async function assertCreateOutcomes(initialNurses, target, generated) {
  const draftId = generated.ids.at(-1);
  const createDraft = {
    ...createBlankNurseDraft({
      now: new Date(CREATED_AT),
      randomUUID: () => draftId,
    }),
    fullName: generated.createName,
  };
  const created = authoritativeNurse({
    id: draftId,
    fullName: generated.createName,
    version: 1,
  });
  const collision = authoritativeNurse({
    id: draftId,
    fullName: `${generated.createName}Collision`,
    version: 2,
  });
  const outcome = {
    label: generated.createOutcome,
    result: generated.createOutcome.startsWith('error:')
      ? errorResult(generated.createOutcome.slice('error:'.length)).result
      : generated.createOutcome === 'collision'
        ? {
            status: 'collision',
            current: collision,
            error: new DataError(DataErrorCode.CONFLICT),
          }
        : { status: 'saved', nurse: created },
  };

  const gate = deferred();
  const { repository, calls } = createRecordingRepository(initialNurses, target, {
    create: () => gate.promise,
  });
  const controller = createNurseController({
    repository,
    makeCreateDraft: () => structuredClone(createDraft),
  });
  await controller.refreshNurses();
  controller.openCreate();
  const before = committedSnapshot(controller.getState());
  const draftBefore = structuredClone(controller.getState().createDraft);

  const pending = controller.createNurse();
  const duplicate = controller.createNurse();
  expect(duplicate, outcome.label).toBe(pending);
  expect(calls.create, outcome.label).toHaveLength(1);
  expectCommittedState(controller, before);
  expect(controller.getState().createDraft, outcome.label).toEqual(draftBefore);
  expect(controller.getState().createState, outcome.label).toBe(NurseAsyncState.LOADING);

  gate.resolve(outcome.result);
  await pending;

  if (outcome.result.status === 'saved') {
    expect(controller.getState().items, outcome.label).toEqual([...initialNurses, created]);
    expect(controller.getState().total, outcome.label).toBe(initialNurses.length + 1);
    expect(controller.getState().createDraft, outcome.label).toBeNull();
  } else {
    expectCommittedState(controller, before);
    expect(controller.getState().createDraft, outcome.label).toEqual(draftBefore);
  }
}

async function assertRejectedSave(initialNurses, target) {
  const { repository, calls } = createRecordingRepository(initialNurses, target);
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);
  controller.updateDraft({ fullName: '' });
  const before = committedSnapshot(controller.getState());
  const draftBefore = structuredClone(controller.getState().draft);

  const result = await controller.saveNurse();

  expect(result).toMatchObject({ status: 'error', error: { code: DataErrorCode.VALIDATION } });
  expect(calls.save).toHaveLength(0);
  expectCommittedState(controller, before);
  expect(controller.getState().draft).toEqual(draftBefore);
}

async function assertSaveOutcomes(initialNurses, target, generated) {
  const localName = `${generated.targetName}Edited`;
  const latest = {
    ...target,
    fullName: `${generated.targetName}Latest`,
    version: target.version + 1,
    updatedAt: UPDATED_AT,
  };
  const saved = {
    ...target,
    fullName: localName,
    version: target.version + 2,
    updatedAt: UPDATED_AT,
  };
  const outcome = {
    label: generated.saveOutcome,
    result: generated.saveOutcome.startsWith('error:')
      ? errorResult(generated.saveOutcome.slice('error:'.length)).result
      : generated.saveOutcome === 'conflict'
        ? { status: 'conflict', current: latest }
        : generated.saveOutcome === 'notFound'
          ? { status: 'notFound' }
          : { status: 'saved', nurse: saved },
  };

  const gate = deferred();
  const { repository, calls } = createRecordingRepository(initialNurses, target, {
    save: () => gate.promise,
  });
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);
  controller.updateDraft({ fullName: localName });
  const before = committedSnapshot(controller.getState());
  const draftBefore = structuredClone(controller.getState().draft);

  const pending = controller.saveNurse();
  const duplicate = controller.saveNurse();
  expect(duplicate, outcome.label).toBe(pending);
  expect(calls.save, outcome.label).toHaveLength(1);
  expectCommittedState(controller, before);
  expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  expect(controller.getState().saveState, outcome.label).toBe(NurseAsyncState.LOADING);

  gate.resolve(outcome.result);
  await pending;

  if (outcome.result.status === 'saved') {
    expect(controller.getState().items, outcome.label).toEqual(
      initialNurses.map((nurse) => (nurse.id === target.id ? saved : nurse))
    );
    expect(controller.getState()).toMatchObject({
      selected: saved,
      originalBase: saved,
      draft: saved,
      baseVersion: saved.version,
    });
  } else if (outcome.result.status === 'notFound') {
    expect(controller.getState().items, outcome.label).toEqual(
      initialNurses.filter((nurse) => nurse.id !== target.id)
    );
    expect(controller.getState().orphanedDraft, outcome.label).toEqual(draftBefore);
  } else {
    expectCommittedState(controller, before);
    expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  }
}

async function assertPipelineOutcomes(initialNurses, target, generated) {
  const proposedStage = 'Screening';
  const saved = {
    ...target,
    pipelineStage: proposedStage,
    readinessStatus: calculateReadinessStatus(proposedStage),
    version: target.version + 1,
    updatedAt: UPDATED_AT,
  };
  const latest = {
    ...target,
    fullName: `${generated.targetName}Latest`,
    version: target.version + 1,
    updatedAt: UPDATED_AT,
  };
  const outcome = {
    label: generated.pipelineOutcome,
    result: generated.pipelineOutcome.startsWith('error:')
      ? errorResult(generated.pipelineOutcome.slice('error:'.length)).result
      : generated.pipelineOutcome === 'conflict'
        ? { status: 'conflict', current: latest }
        : generated.pipelineOutcome === 'notFound'
          ? { status: 'notFound' }
          : { status: 'saved', nurse: saved },
  };

  const gate = deferred();
  const { repository, calls } = createRecordingRepository(initialNurses, target, {
    save: () => gate.promise,
  });
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);
  controller.updateDraft({ notesFlags: `${generated.targetName} local pipeline draft` });
  const before = committedSnapshot(controller.getState());
  const draftBefore = structuredClone(controller.getState().draft);

  const pending = controller.changeNursePipeline(target.id, proposedStage, target.version);
  const duplicate = controller.changeNursePipeline(target.id, proposedStage, target.version);
  expect(duplicate, outcome.label).toBe(pending);
  expect(calls.save, outcome.label).toHaveLength(1);
  expectCommittedState(controller, before);
  expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  expect(controller.getState().pipeline[target.id].state, outcome.label).toBe(
    NurseAsyncState.LOADING
  );

  gate.resolve(outcome.result);
  await pending;

  if (outcome.result.status === 'saved') {
    expect(controller.getState().items, outcome.label).toEqual(
      initialNurses.map((nurse) => (nurse.id === target.id ? saved : nurse))
    );
    expect(controller.getState()).toMatchObject({
      selected: saved,
      originalBase: saved,
      draft: saved,
      baseVersion: saved.version,
    });
  } else if (outcome.result.status === 'notFound') {
    expect(controller.getState().items, outcome.label).toEqual(
      initialNurses.filter((nurse) => nurse.id !== target.id)
    );
    expect(controller.getState().orphanedDraft, outcome.label).toEqual(draftBefore);
  } else {
    expectCommittedState(controller, before);
    expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  }
}

async function assertDeleteOutcomes(initialNurses, target, generated) {
  const latest = {
    ...target,
    fullName: `${generated.targetName}Latest`,
    version: target.version + 1,
    updatedAt: UPDATED_AT,
  };
  const outcome = {
    label: generated.deleteOutcome,
    result: generated.deleteOutcome.startsWith('error:')
      ? errorResult(generated.deleteOutcome.slice('error:'.length)).result
      : generated.deleteOutcome === 'conflict'
        ? { status: 'conflict', current: latest }
        : { status: generated.deleteOutcome },
  };

  const gate = deferred();
  const { repository, calls } = createRecordingRepository(initialNurses, target, {
    remove: () => gate.promise,
  });
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);
  controller.updateDraft({ notesFlags: `${generated.targetName} local delete draft` });
  const before = committedSnapshot(controller.getState());
  const draftBefore = structuredClone(controller.getState().draft);

  expect(controller.requestDelete()).toBe(true);
  expectCommittedState(controller, before);
  expect(controller.getState().draft).toEqual(draftBefore);

  const pending = controller.confirmDelete();
  const duplicate = controller.confirmDelete();
  expect(duplicate, outcome.label).toBe(pending);
  expect(calls.remove, outcome.label).toHaveLength(1);
  expectCommittedState(controller, before);
  expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  expect(controller.getState().deleteState, outcome.label).toBe(NurseAsyncState.LOADING);

  gate.resolve(outcome.result);
  await pending;

  if (['deleted', 'alreadyDeleted'].includes(outcome.result.status)) {
    expect(controller.getState().items, outcome.label).toEqual(
      initialNurses.filter((nurse) => nurse.id !== target.id)
    );
    expect(controller.getState()).toMatchObject({
      total: initialNurses.length - 1,
      selectedId: null,
      selected: null,
      draft: null,
      deleteState: NurseAsyncState.SUCCESS,
    });
  } else {
    expectCommittedState(controller, before);
    expect(controller.getState().draft, outcome.label).toEqual(draftBefore);
  }
}

async function assertExplicitDiscardBoundary(initialNurses, target, generated) {
  const { repository, calls } = createRecordingRepository(initialNurses, target);
  const controller = createNurseController({ repository });
  await loadListAndDetail(controller, target);
  controller.updateDraft({ fullName: `${generated.targetName}Discarded` });
  const itemsBefore = structuredClone(controller.getState().items);
  const draftBefore = structuredClone(controller.getState().draft);

  expect(controller.requestCancelEdit()).toEqual({ status: 'confirmationRequired' });
  expect(controller.getState().items).toEqual(itemsBefore);
  expect(controller.getState().draft).toEqual(draftBefore);

  expect(controller.resolveDiscard(false)).toEqual({ status: 'kept' });
  expect(controller.getState().items).toEqual(itemsBefore);
  expect(controller.getState().draft).toEqual(draftBefore);

  expect(controller.requestCancelEdit()).toEqual({ status: 'confirmationRequired' });
  expect(controller.resolveDiscard(true)).toEqual({ status: 'discarded' });
  expect(controller.getState().items).toEqual(itemsBefore);
  expect(controller.getState()).toMatchObject({
    selectedId: null,
    selected: null,
    originalBase: null,
    draft: null,
  });
  expect(calls.save).toHaveLength(0);
}

describe('Property 8: No unconfirmed state transition', () => {
  // **Validates: Requirements 1.5, 1.12, 3.5, 3.8, 5.5, 5.6, 6.4, 6.5, 6.9, 6.19, 7.5, 7.9, 7.10, 7.11, 7.12, 9.7, 9.9, 9.13**
  it('isolates committed state and drafts until confirmed persistence or explicit discard', async () => {
    await assertAsyncProperty(generatedCaseArbitrary, async (generated) => {
      const initialNurses = buildNurses(generated);
      const target = initialNurses[0];

      await assertListFailureIsolation(initialNurses, target, generated.listErrorCode);
      await assertCreateOutcomes(initialNurses, target, generated);
      await assertRejectedSave(initialNurses, target);
      await assertSaveOutcomes(initialNurses, target, generated);
      await assertPipelineOutcomes(initialNurses, target, generated);
      await assertDeleteOutcomes(initialNurses, target, generated);
      await assertExplicitDiscardBoundary(initialNurses, target, generated);
    });
  });
});
