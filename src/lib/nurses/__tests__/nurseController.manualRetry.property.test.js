import { describe, expect, it, vi } from 'vitest';

import { assertAsyncProperty, fc } from '../../../test/pbt';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const CREATED_AT = '2026-03-10T12:00:00.000Z';
const UPDATED_AT = '2026-03-11T12:00:00.000Z';
const SAFE_CHARACTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'];

const safeTextArbitrary = fc
  .array(fc.constantFrom(...SAFE_CHARACTERS), { minLength: 1, maxLength: 32 })
  .map((characters) => characters.join(''));

const scenarioArbitrary = fc
  .record({
    draftIds: fc.uniqueArray(fc.uuid(), { minLength: 3, maxLength: 3 }),
    ownerId: fc.uuid(),
    recoverableCode: fc.constantFrom(DataErrorCode.NETWORK, DataErrorCode.UNKNOWN),
    createName: safeTextArbitrary,
    createPreferredName: safeTextArbitrary,
    createNotes: safeTextArbitrary,
    createCertification: safeTextArbitrary,
    createSummary: safeTextArbitrary,
    updateName: safeTextArbitrary,
    updatePreferredName: safeTextArbitrary,
    updateNotes: safeTextArbitrary,
    updateCertification: safeTextArbitrary,
    updateSummary: safeTextArbitrary,
    createFlags: fc.integer({ min: 0, max: 100 }),
    updateFlags: fc.integer({ min: 0, max: 100 }),
    baseVersion: fc.integer({ min: 1, max: 1_000_000 }),
    versionAdvance: fc.integer({ min: 1, max: 1_000 }),
  })
  .map((generated) => ({
    ...generated,
    originalName: `Original${generated.updateName}`,
    editedName: `Edited${generated.updateName}`,
  }));

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createDraft(uuid, values) {
  return {
    ...createBlankNurseDraft({
      now: new Date(CREATED_AT),
      randomUUID: () => uuid,
    }),
    ...values,
  };
}

function authoritativeNurse(uuid, ownerId, version, values) {
  const normalized = normalizeNurseCreateDraft(createDraft(uuid, values));
  if (!normalized.valid) throw new Error('Generated nurse must be valid.');
  return {
    ...normalized.value,
    ownerId,
    version,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function expectOnlyIdChanged(before, after, expectedId) {
  expect(after).toEqual({ ...before, id: expectedId });
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function assertCreateRetryPreservation(generated) {
  const [createUuid, freshUuid] = generated.draftIds;
  const originalDraft = createDraft(createUuid, {
    fullName: generated.createName,
    preferredName: generated.createPreferredName,
    flags: generated.createFlags,
    notesFlags: generated.createNotes,
    additionalCertifications: [generated.createCertification],
    communicationLog: [
      {
        date: '2026-03-10',
        channel: 'Email',
        summary: generated.createSummary,
        nextAction: generated.createNotes,
      },
    ],
  });
  const originalSnapshot = structuredClone(originalDraft);
  const freshId = `nurse-${freshUuid}`;
  const failureGate = deferred();
  const successGate = deferred();
  const recoverableError = new DataError(generated.recoverableCode);
  const collision = authoritativeNurse(createUuid, generated.ownerId, 2, {
    fullName: `${generated.createName}Collision`,
  });
  let createAttempt = 0;
  const repository = {
    listAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(() => {
      createAttempt += 1;
      if (createAttempt === 1) return failureGate.promise;
      if (createAttempt === 2) {
        return Promise.resolve({
          status: 'collision',
          current: collision,
          error: new DataError(DataErrorCode.CONFLICT),
        });
      }
      return successGate.promise;
    }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const makeDraftId = vi.fn(() => freshId);
  const controller = createNurseController({
    repository,
    makeCreateDraft: () => structuredClone(originalDraft),
    makeDraftId,
  });

  controller.openCreate();
  const firstRequest = controller.createNurse();
  const duplicateRequest = controller.createNurse();

  expect(duplicateRequest).toBe(firstRequest);
  expect(repository.create).toHaveBeenCalledTimes(1);
  expect(repository.create.mock.calls[0][0]).toEqual(originalSnapshot);
  expect(controller.getState()).toMatchObject({
    createDraft: originalSnapshot,
    createState: NurseAsyncState.LOADING,
  });

  failureGate.resolve({ status: 'error', error: recoverableError });
  await firstRequest;
  await flushMicrotasks();

  expect(repository.create).toHaveBeenCalledTimes(1);
  expect(makeDraftId).not.toHaveBeenCalled();
  expect(controller.getState()).toMatchObject({
    createDraft: originalSnapshot,
    createState: NurseAsyncState.ERROR,
    createError: recoverableError,
    createDecision: { type: 'createFailure', retryAvailable: true },
  });

  await controller.retryCreate();

  expect(repository.create).toHaveBeenCalledTimes(2);
  expect(repository.create.mock.calls[1][0]).toEqual(originalSnapshot);
  expect(repository.create.mock.calls[1][1]).toMatchObject({ retry: true });
  expect(makeDraftId).not.toHaveBeenCalled();
  expect(controller.getState()).toMatchObject({
    createDraft: originalSnapshot,
    createState: NurseAsyncState.ERROR,
    createDecision: { type: 'createCollision', retryAvailable: true },
  });

  await flushMicrotasks();
  expect(repository.create).toHaveBeenCalledTimes(2);
  await controller.retryCreate();
  expect(repository.create).toHaveBeenCalledTimes(2);
  expect(makeDraftId).not.toHaveBeenCalled();

  const collisionRetry = controller.retryCreateAfterCollision();
  const freshDraft = structuredClone(controller.getState().createDraft);

  expect(makeDraftId).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(3);
  expectOnlyIdChanged(originalSnapshot, freshDraft, freshId);
  expectOnlyIdChanged(originalSnapshot, repository.create.mock.calls[2][0], freshId);
  expect(repository.create.mock.calls[2][1]).toMatchObject({ retry: true });
  expect(controller.getState().createState).toBe(NurseAsyncState.LOADING);

  const committed = {
    ...freshDraft,
    ownerId: generated.ownerId,
    version: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
  successGate.resolve({ status: 'saved', nurse: committed });
  await collisionRetry;

  expect(repository.create).toHaveBeenCalledTimes(3);
  expect(makeDraftId).toHaveBeenCalledTimes(1);
  expect(controller.getState()).toMatchObject({
    items: [committed],
    total: 1,
    createDraft: null,
    createState: NurseAsyncState.SUCCESS,
  });
  expect(originalDraft).toEqual(originalSnapshot);
}

async function assertUpdateRetryPreservation(generated) {
  const updateUuid = generated.draftIds[2];
  const original = authoritativeNurse(updateUuid, generated.ownerId, generated.baseVersion, {
    fullName: generated.originalName,
  });
  const failureGate = deferred();
  const successGate = deferred();
  const recoverableError = new DataError(generated.recoverableCode);
  let saveAttempt = 0;
  const repository = {
    listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
    get: vi.fn(async () => ({ status: 'ok', nurse: original })),
    create: vi.fn(),
    save: vi.fn(() => {
      saveAttempt += 1;
      return saveAttempt === 1 ? failureGate.promise : successGate.promise;
    }),
    remove: vi.fn(),
  };
  const controller = createNurseController({ repository });

  await controller.refreshNurses();
  await controller.openNurse(original.id);
  controller.updateDraft({
    fullName: generated.editedName,
    preferredName: generated.updatePreferredName,
    flags: generated.updateFlags,
    notesFlags: generated.updateNotes,
    additionalCertifications: [generated.updateCertification],
    communicationLog: [
      {
        date: '2026-03-11',
        channel: 'Phone',
        summary: generated.updateSummary,
        nextAction: generated.updateNotes,
      },
    ],
  });
  const draftSnapshot = structuredClone(controller.getState().draft);
  const committedSnapshot = structuredClone(controller.getState().items);

  const firstRequest = controller.saveNurse();
  const duplicateRequest = controller.saveNurse();

  expect(duplicateRequest).toBe(firstRequest);
  expect(repository.save).toHaveBeenCalledTimes(1);
  expect(controller.getState()).toMatchObject({
    items: committedSnapshot,
    selected: original,
    draft: draftSnapshot,
    saveState: NurseAsyncState.LOADING,
  });

  failureGate.resolve({ status: 'error', error: recoverableError });
  await firstRequest;
  await flushMicrotasks();

  expect(repository.save).toHaveBeenCalledTimes(1);
  expect(controller.getState()).toMatchObject({
    items: committedSnapshot,
    selected: original,
    originalBase: original,
    draft: draftSnapshot,
    baseVersion: generated.baseVersion,
    saveState: NurseAsyncState.ERROR,
    saveError: recoverableError,
    saveDecision: { type: 'saveFailure', retryAvailable: true },
  });

  const retryRequest = controller.retrySave();

  expect(repository.save).toHaveBeenCalledTimes(2);
  expect(repository.save.mock.calls[1][0]).toBe(repository.save.mock.calls[0][0]);
  expect(repository.save.mock.calls[1][1]).toEqual(repository.save.mock.calls[0][1]);
  expect(repository.save.mock.calls[1][2]).toBe(repository.save.mock.calls[0][2]);
  expect(repository.save.mock.calls[1][3]).toEqual({ retryCount: 1 });
  expect(controller.getState()).toMatchObject({
    items: committedSnapshot,
    selected: original,
    originalBase: original,
    draft: draftSnapshot,
    baseVersion: generated.baseVersion,
    saveState: NurseAsyncState.LOADING,
  });

  const committed = {
    ...repository.save.mock.calls[1][1],
    id: original.id,
    ownerId: original.ownerId,
    version: generated.baseVersion + generated.versionAdvance,
    createdAt: original.createdAt,
    updatedAt: UPDATED_AT,
  };
  successGate.resolve({ status: 'saved', nurse: committed });
  await retryRequest;

  expect(repository.save).toHaveBeenCalledTimes(2);
  expect(controller.getState()).toMatchObject({
    items: [committed],
    selected: committed,
    originalBase: committed,
    draft: committed,
    baseVersion: committed.version,
    saveState: NurseAsyncState.SUCCESS,
  });
}

describe('Property 14: Manual retry preserves draft identity and values', () => {
  // **Validates: Requirements 3.3, 3.5, 3.8, 3.9, 3.12, 6.4, 6.19, 6.20, 6.21, 9.10**
  it('requires explicit create and update retries while preserving values and collision-safe identity', async () => {
    await assertAsyncProperty(scenarioArbitrary, async (generated) => {
      await assertCreateRetryPreservation(generated);
      await assertUpdateRetryPreservation(generated);
    });
  });
});
