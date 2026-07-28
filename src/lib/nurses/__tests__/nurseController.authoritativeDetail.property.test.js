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

const scenarioArb = fc
  .record({
    selections: fc.uniqueArray(
      fc.record({
        uuid: fc.uuid(),
        staleName: safeNameArb,
        staleVersion: fc.integer({ min: 1, max: 10_000 }),
        responsePriority: fc.integer(),
      }),
      { minLength: 2, maxLength: 5, selector: ({ uuid }) => uuid },
    ),
    ownerId: fc.uuid(),
    authoritativeName: safeNameArb,
    baseVersion: fc.integer({ min: 1, max: 10_000 }),
    editNames: fc.uniqueArray(safeNameArb, { minLength: 1, maxLength: 4 }),
    lateResponseSplitSeed: fc.nat(),
    finalDecision: fc.constantFrom(
      'confirm',
      'declineKeep',
      'declineThenConfirm',
      'declineThenSave',
    ),
  })
  .filter(({ authoritativeName, editNames }) => !editNames.includes(authoritativeName));

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

function controlledRepository() {
  const detailRequests = [];
  let committedNurse = null;

  const repository = {
    listAll: vi.fn(async () => ({ status: 'ok', nurses: [], total: 0 })),
    get: vi.fn((id) => {
      const gate = deferred();
      detailRequests.push({ id, gate });
      return gate.promise;
    }),
    create: vi.fn(),
    save: vi.fn(async (id, input, baseVersion) => {
      committedNurse = {
        ...structuredClone(input),
        id,
        version: baseVersion + 1,
        updatedAt: UPDATED_AT,
      };
      return { status: 'saved', nurse: structuredClone(committedNurse) };
    }),
    remove: vi.fn(),
  };

  return {
    committedNurse: () => structuredClone(committedNurse),
    detailRequests,
    repository,
  };
}

function expectNoEstablishedDetail(controller, selectedId, expectedState) {
  expect(controller.getState()).toMatchObject({
    selectedId,
    selected: null,
    detailState: expectedState,
    originalBase: null,
    draft: null,
    baseVersion: null,
  });
}

describe('Property 9: Authoritative detail and draft isolation', () => {
  // **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 5.10, 5.13**
  it('accepts only the newest selected response and writes only after explicit save', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (generated) => {
        const controlled = controlledRepository();
        const controller = createNurseController({ repository: controlled.repository });
        const selections = generated.selections.map((selection) => ({
          ...selection,
          id: `nurse-${selection.uuid}`,
        }));
        const latestSelection = selections.at(-1);

        const initialRequests = selections.map((selection) =>
          controller.openNurse(selection.id),
        );
        const newestPendingRequest = controller.openNurse(latestSelection.id);

        expect(controlled.repository.get.mock.calls.map(([id]) => id)).toEqual([
          ...selections.map(({ id }) => id),
          latestSelection.id,
        ]);
        expectNoEstablishedDetail(
          controller,
          latestSelection.id,
          NurseAsyncState.LOADING,
        );
        expect(controller.updateDraft({ fullName: 'BlockedWhileLoading' })).toBeNull();
        await controller.saveNurse();
        expect(controlled.repository.save).not.toHaveBeenCalled();

        const staleIndexes = selections
          .map((selection, index) => ({ index, priority: selection.responsePriority }))
          .sort((left, right) => left.priority - right.priority || left.index - right.index)
          .map(({ index }) => index);
        const split = generated.lateResponseSplitSeed % (staleIndexes.length + 1);
        const resolveStaleResponse = async (index) => {
          const selection = selections[index];
          controlled.detailRequests[index].gate.resolve({
            status: 'ok',
            nurse: authoritativeNurse({
              uuid: selection.uuid,
              fullName: selection.staleName,
              ownerId: generated.ownerId,
              version: selection.staleVersion,
            }),
          });
          await initialRequests[index];
        };

        for (const index of staleIndexes.slice(0, split)) {
          await resolveStaleResponse(index);
          expectNoEstablishedDetail(
            controller,
            latestSelection.id,
            NurseAsyncState.LOADING,
          );
        }

        const recoverableFailure = new DataError(DataErrorCode.NETWORK);
        controlled.detailRequests[selections.length].gate.resolve({
          status: 'error',
          error: recoverableFailure,
        });
        await newestPendingRequest;
        expectNoEstablishedDetail(controller, latestSelection.id, NurseAsyncState.ERROR);
        expect(controller.getState().detailError).toBe(recoverableFailure);

        const retryRequest = controller.retryDetail();
        expect(controlled.repository.get).toHaveBeenCalledTimes(selections.length + 2);
        expect(controlled.repository.get).toHaveBeenLastCalledWith(latestSelection.id, {
          retryCount: 1,
        });
        expectNoEstablishedDetail(
          controller,
          latestSelection.id,
          NurseAsyncState.LOADING,
        );
        expect(controller.updateDraft({ fullName: 'StillBlockedWhileRetrying' })).toBeNull();
        expect(controlled.repository.save).not.toHaveBeenCalled();

        const authoritative = authoritativeNurse({
          uuid: latestSelection.uuid,
          fullName: generated.authoritativeName,
          ownerId: generated.ownerId,
          version: generated.baseVersion,
        });
        controlled.detailRequests[selections.length + 1].gate.resolve({
          status: 'ok',
          nurse: authoritative,
        });
        await retryRequest;

        expect(controller.getState()).toMatchObject({
          selectedId: latestSelection.id,
          selected: authoritative,
          detailState: NurseAsyncState.SUCCESS,
          detailError: null,
          originalBase: authoritative,
          draft: authoritative,
          baseVersion: generated.baseVersion,
        });

        for (const index of staleIndexes.slice(split)) {
          await resolveStaleResponse(index);
          expect(controller.getState()).toMatchObject({
            selectedId: latestSelection.id,
            selected: authoritative,
            detailState: NurseAsyncState.SUCCESS,
            originalBase: authoritative,
            draft: authoritative,
            baseVersion: generated.baseVersion,
          });
        }

        for (const fullName of generated.editNames) {
          controller.updateDraft({ fullName });
          expect(controller.getState().selected).toEqual(authoritative);
          expect(controller.getState().originalBase).toEqual(authoritative);
          expect(controller.getState().draft.fullName).toBe(fullName);
          expect(controlled.repository.save).not.toHaveBeenCalled();
        }
        await Promise.resolve();
        expect(controlled.repository.save).not.toHaveBeenCalled();

        const dirtyDraft = structuredClone(controller.getState().draft);
        expect(controller.requestCancelEdit()).toEqual({ status: 'confirmationRequired' });
        expect(controller.getState().discardDecision).toEqual({ type: 'discardEdit' });
        expect(controller.getState().draft).toEqual(dirtyDraft);
        expect(controlled.repository.save).not.toHaveBeenCalled();

        if (generated.finalDecision === 'confirm') {
          expect(controller.resolveDiscard(true)).toEqual({ status: 'discarded' });
          expect(controller.getState()).toMatchObject({
            selectedId: null,
            originalBase: null,
            draft: null,
            baseVersion: null,
          });
          expect(controlled.repository.save).not.toHaveBeenCalled();
          return;
        }

        expect(controller.resolveDiscard(false)).toEqual({ status: 'kept' });
        expect(controller.getState()).toMatchObject({
          selectedId: latestSelection.id,
          selected: authoritative,
          originalBase: authoritative,
          draft: dirtyDraft,
          baseVersion: generated.baseVersion,
          discardDecision: null,
        });
        expect(controlled.repository.save).not.toHaveBeenCalled();

        if (generated.finalDecision === 'declineThenConfirm') {
          expect(controller.requestCancelEdit()).toEqual({ status: 'confirmationRequired' });
          expect(controller.getState().draft).toEqual(dirtyDraft);
          expect(controller.resolveDiscard(true)).toEqual({ status: 'discarded' });
          expect(controller.getState().draft).toBeNull();
          expect(controlled.repository.save).not.toHaveBeenCalled();
        } else if (generated.finalDecision === 'declineThenSave') {
          const saveResult = await controller.saveNurse();
          const committed = controlled.committedNurse();

          expect(controlled.repository.save).toHaveBeenCalledTimes(1);
          expect(controlled.repository.save.mock.calls[0][0]).toBe(latestSelection.id);
          expect(controlled.repository.save.mock.calls[0][2]).toBe(generated.baseVersion);
          expect(saveResult).toEqual({ status: 'saved', nurse: committed });
          expect(controller.getState()).toMatchObject({
            selected: committed,
            originalBase: committed,
            draft: committed,
            baseVersion: generated.baseVersion + 1,
          });
        } else {
          expect(generated.finalDecision).toBe('declineKeep');
          expect(controller.getState().draft).toEqual(dirtyDraft);
          expect(controlled.repository.save).not.toHaveBeenCalled();
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
