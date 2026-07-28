import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

/**
 * Feature: nurse-management
 * Property 1: Backend-source isolation and confirmed-state fidelity
 *
 * In Supabase mode, generated local records are never consulted or displayed.
 * Only complete successful remote lists can replace confirmed state; remote
 * failures retain the last accepted list (or the initial empty state) and are
 * surfaced without falling back to storage.
 *
 * **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.7, 2.10**
 */

const h = vi.hoisted(() => {
  const makeAdapter = () => ({
    listNurses: vi.fn(),
    getNurse: vi.fn(),
    createNurse: vi.fn(),
    updateNurse: vi.fn(),
    deleteNurse: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    bulkUpsert: vi.fn(),
    bulkUpdate: vi.fn(),
    getCollection: vi.fn(),
    saveCollection: vi.fn(),
  });

  return {
    storageAdapter: makeAdapter(),
    supabaseAdapter: makeAdapter(),
  };
});

vi.mock('../../featureFlags', () => ({
  isFeatureEnabled: (name) => name === 'SUPABASE_BACKEND',
}));
vi.mock('../../dataLayer/storageAdapter', () => h.storageAdapter);
vi.mock('../../dataLayer/supabaseAdapter', () => h.supabaseAdapter);

import { nurseOps } from '../../dataLayer';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';
import { createNurseRepository } from '../nurseRepository';

const NUM_RUNS = 100;
const ACTIVE_USER_ID = '11111111-1111-4111-8111-111111111111';
const SAFE_NAME_CHARACTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '];

const safeNameArbitrary = fc
  .array(fc.constantFrom(...SAFE_NAME_CHARACTERS), { minLength: 1, maxLength: 40 })
  .map((characters) => characters.join('').trim() || 'Nurse');

function nurseArbitrary(source) {
  return fc.record({
    id: fc.uuid().map((uuid) => `${source}-${uuid}`),
    fullName: safeNameArbitrary,
    provenance: fc.constant(source),
    version: fc.integer({ min: 1, max: 10_000 }),
  });
}

const isolationScenarioArbitrary = fc.record({
  localSamples: fc.uniqueArray(nurseArbitrary('local'), {
    minLength: 1,
    maxLength: 8,
    selector: (nurse) => nurse.id,
  }),
  acceptedRemote: fc.uniqueArray(nurseArbitrary('remote'), {
    minLength: 1,
    maxLength: 8,
    selector: (nurse) => nurse.id,
  }),
  failureCode: fc.constantFrom(
    DataErrorCode.NETWORK,
    DataErrorCode.AUTH,
    DataErrorCode.FORBIDDEN,
    DataErrorCode.VALIDATION,
    DataErrorCode.UNKNOWN,
  ),
});

function totalCalls(adapter) {
  return Object.values(adapter).reduce(
    (count, operation) => count + operation.mock.calls.length,
    0,
  );
}

function expectOnlyAcceptedRemoteNurses(state, acceptedRemote) {
  const remoteIds = new Set(acceptedRemote.map((nurse) => nurse.id));
  expect(state.items).toEqual(acceptedRemote);
  expect(state.items.every((nurse) => nurse.provenance === 'remote')).toBe(true);
  expect(state.items.every((nurse) => remoteIds.has(nurse.id))).toBe(true);
}

function makeRepository() {
  return createNurseRepository({
    operations: nurseOps,
    supabase: true,
    readSession: vi.fn(async () => ({
      session: {
        user: { id: ACTIVE_USER_ID },
        access_token: 'property-test-token',
      },
      error: null,
    })),
    sessionExpired: () => false,
  });
}

describe('Property 1: Backend-source isolation and confirmed-state fidelity', () => {
  it('renders only accepted remote nurses and never falls back to local sources on empty or failed responses', async () => {
    await fc.assert(
      fc.asyncProperty(isolationScenarioArbitrary, async (generated) => {
        vi.clearAllMocks();

        h.storageAdapter.listNurses.mockResolvedValue({
          data: generated.localSamples,
          error: null,
          total: generated.localSamples.length,
        });
        h.storageAdapter.getCollection.mockResolvedValue({
          data: generated.localSamples,
          error: null,
        });

        const remoteFailure = new DataError(generated.failureCode);
        h.supabaseAdapter.listNurses
          .mockResolvedValueOnce({
            data: generated.acceptedRemote,
            error: null,
            total: generated.acceptedRemote.length,
          })
          .mockResolvedValueOnce({ data: null, error: remoteFailure, total: 0 })
          .mockResolvedValueOnce({ data: [], error: null, total: 0 })
          .mockResolvedValueOnce({ data: null, error: remoteFailure, total: 0 })
          .mockResolvedValueOnce({ data: null, error: remoteFailure, total: 0 });

        const controller = createNurseController({ repository: makeRepository() });

        await controller.refreshNurses();
        const acceptedState = controller.getState();
        expectOnlyAcceptedRemoteNurses(acceptedState, generated.acceptedRemote);
        expect(acceptedState).toMatchObject({
          total: generated.acceptedRemote.length,
          hasAcceptedList: true,
          listState: NurseAsyncState.SUCCESS,
          listError: null,
          staleWarning: false,
        });

        const confirmedBeforeFailure = {
          items: structuredClone(acceptedState.items),
          total: acceptedState.total,
          hasAcceptedList: acceptedState.hasAcceptedList,
        };
        await controller.refreshNurses();
        const staleState = controller.getState();
        expectOnlyAcceptedRemoteNurses(staleState, generated.acceptedRemote);
        expect(staleState).toMatchObject({
          ...confirmedBeforeFailure,
          listState: NurseAsyncState.ERROR,
          listError: remoteFailure,
          staleWarning: true,
        });

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

        await controller.refreshNurses();
        expect(controller.getState()).toMatchObject({
          items: [],
          total: 0,
          hasAcceptedList: true,
          listState: NurseAsyncState.ERROR,
          listError: remoteFailure,
          staleWarning: true,
        });

        const initiallyFailingController = createNurseController({
          repository: makeRepository(),
        });
        await initiallyFailingController.refreshNurses();
        expect(initiallyFailingController.getState()).toMatchObject({
          items: [],
          total: 0,
          hasAcceptedList: false,
          listState: NurseAsyncState.ERROR,
          listError: remoteFailure,
          staleWarning: false,
        });

        expect(h.supabaseAdapter.listNurses).toHaveBeenCalledTimes(5);
        expect(totalCalls(h.storageAdapter)).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
