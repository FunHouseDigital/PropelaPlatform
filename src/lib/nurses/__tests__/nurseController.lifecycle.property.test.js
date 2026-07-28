import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';

/**
 * Feature: nurse-management
 * Property 4: Accepted-list lifecycle and single-flight refresh
 *
 * For any prior Accepted_List and Reported_Total, refreshes preserve accepted
 * values while pending or failed, duplicate activations share one repository
 * request, and successful retries/refreshes replace the accepted values exactly
 * while clearing stale failure state. Filtering a nonempty accepted list to no
 * visible nurses remains a filter-no-match state, never an empty-table state.
 *
 * **Validates: Requirements 2.2, 2.5, 2.6, 2.8, 2.9, 2.10, 2.11, 2.12**
 */

const NUM_RUNS = 100;

const safeTextArbitrary = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '), {
    minLength: 1,
    maxLength: 40,
  })
  .map((characters) => characters.join('').trim() || 'Nurse');

const nurseArbitrary = fc.record({
  id: fc.uuid().map((uuid) => `nurse-${uuid}`),
  fullName: safeTextArbitrary,
  email: safeTextArbitrary.map((value) => `${value.replaceAll(' ', '').toLowerCase()}@example.test`),
  sancNumber: safeTextArbitrary,
  pipelineStage: fc.constantFrom('Applied', 'Screening', 'Training Active'),
  version: fc.integer({ min: 1, max: 10_000 }),
});

const acceptedListArbitrary = (minimumLength = 0) =>
  fc.uniqueArray(nurseArbitrary, {
    minLength: minimumLength,
    maxLength: 10,
    selector: (nurse) => nurse.id,
  });

const lifecycleArbitrary = fc.record({
  prior: acceptedListArbitrary(0),
  retried: acceptedListArbitrary(0),
  refreshed: acceptedListArbitrary(1),
  duplicateActivations: fc.integer({ min: 2, max: 8 }),
  failureCode: fc.constantFrom(
    DataErrorCode.NETWORK,
    DataErrorCode.STORAGE,
    DataErrorCode.UNKNOWN,
  ),
  missingToken: fc.uuid().map((uuid) => `definitely_missing_${uuid}`),
});

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function searchNurses(nurses, query) {
  const normalized = query.toLowerCase().trim();
  return nurses.filter(
    (nurse) =>
      nurse.fullName.toLowerCase().includes(normalized) ||
      nurse.email.toLowerCase().includes(normalized) ||
      nurse.sancNumber.toLowerCase().includes(normalized),
  );
}

function classifyListPresentation(state, visibleNurses) {
  return {
    emptyTable: state.hasAcceptedList && state.total === 0,
    filterNoMatch:
      state.hasAcceptedList && state.total > 0 && visibleNurses.length === 0,
    reportedTotal: state.total,
  };
}

describe('Property 4: Accepted-list lifecycle and single-flight refresh', () => {
  it('preserves, deduplicates, replaces, clears stale state, and distinguishes filtered zero from empty', async () => {
    await fc.assert(
      fc.asyncProperty(lifecycleArbitrary, async (generated) => {
        const failedRefresh = deferred();
        const successfulRetry = deferred();
        const repository = {
          listAll: vi
            .fn()
            .mockResolvedValueOnce({
              status: 'ok',
              nurses: generated.prior,
              total: generated.prior.length,
            })
            .mockImplementationOnce(() => failedRefresh.promise)
            .mockImplementationOnce(() => successfulRetry.promise)
            .mockResolvedValueOnce({
              status: 'ok',
              nurses: generated.refreshed,
              total: generated.refreshed.length,
            })
            .mockResolvedValueOnce({ status: 'ok', nurses: [], total: 0 }),
        };
        const controller = createNurseController({ repository });

        await controller.refreshNurses();
        expect(controller.getState()).toMatchObject({
          items: generated.prior,
          total: generated.prior.length,
          hasAcceptedList: true,
          listState: NurseAsyncState.SUCCESS,
          listError: null,
          staleWarning: false,
        });

        const pendingRefresh = controller.refreshNurses();
        const duplicateRefreshes = Array.from(
          { length: generated.duplicateActivations - 1 },
          () => controller.refreshNurses(),
        );

        expect(duplicateRefreshes.every((request) => request === pendingRefresh)).toBe(true);
        expect(repository.listAll).toHaveBeenCalledTimes(2);
        expect(controller.getState()).toMatchObject({
          items: generated.prior,
          total: generated.prior.length,
          listState: NurseAsyncState.LOADING,
          listError: null,
          staleWarning: false,
        });

        const refreshError = new DataError(generated.failureCode);
        failedRefresh.resolve({ status: 'error', error: refreshError });
        await Promise.all([pendingRefresh, ...duplicateRefreshes]);

        expect(repository.listAll).toHaveBeenCalledTimes(2);
        expect(controller.getState()).toMatchObject({
          items: generated.prior,
          total: generated.prior.length,
          hasAcceptedList: true,
          listState: NurseAsyncState.ERROR,
          listError: refreshError,
          staleWarning: true,
        });

        const pendingRetry = controller.retryNurses();
        const duplicateDuringRetry = controller.refreshNurses();

        expect(duplicateDuringRetry).toBe(pendingRetry);
        expect(repository.listAll).toHaveBeenCalledTimes(3);
        expect(repository.listAll).toHaveBeenLastCalledWith({ retryCount: 1 });
        expect(controller.getState()).toMatchObject({
          items: generated.prior,
          total: generated.prior.length,
          listState: NurseAsyncState.LOADING,
          listError: null,
          staleWarning: true,
        });

        successfulRetry.resolve({
          status: 'ok',
          nurses: generated.retried,
          total: generated.retried.length,
        });
        await Promise.all([pendingRetry, duplicateDuringRetry]);

        expect(controller.getState()).toMatchObject({
          items: generated.retried,
          total: generated.retried.length,
          hasAcceptedList: true,
          listState: NurseAsyncState.SUCCESS,
          listError: null,
          staleWarning: false,
        });

        const successfulRefresh = controller.refreshNurses();
        expect(controller.getState()).toMatchObject({
          items: generated.retried,
          total: generated.retried.length,
          listState: NurseAsyncState.LOADING,
        });
        await successfulRefresh;

        const refreshedState = controller.getState();
        expect(refreshedState).toMatchObject({
          items: generated.refreshed,
          total: generated.refreshed.length,
          hasAcceptedList: true,
          listState: NurseAsyncState.SUCCESS,
          listError: null,
          staleWarning: false,
        });

        const stateBeforeFiltering = controller.getState();
        const visibleNurses = searchNurses(refreshedState.items, generated.missingToken);
        const filteredPresentation = classifyListPresentation(refreshedState, visibleNurses);

        expect(visibleNurses).toEqual([]);
        expect(filteredPresentation).toEqual({
          emptyTable: false,
          filterNoMatch: true,
          reportedTotal: generated.refreshed.length,
        });
        expect(controller.getState()).toEqual(stateBeforeFiltering);

        await controller.refreshNurses();
        const emptyState = controller.getState();
        expect(emptyState).toMatchObject({
          items: [],
          total: 0,
          hasAcceptedList: true,
          listState: NurseAsyncState.SUCCESS,
          listError: null,
          staleWarning: false,
        });
        expect(classifyListPresentation(emptyState, [])).toEqual({
          emptyTable: true,
          filterNoMatch: false,
          reportedTotal: 0,
        });
        expect(repository.listAll).toHaveBeenCalledTimes(5);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
