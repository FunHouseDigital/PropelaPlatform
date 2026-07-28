import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { seedNurses } from '../../../data/seedNurses';
import {
  getNurses,
  initializeApplicationStorage,
  setData,
} from '../../storage';
import { STORAGE_PREFIX } from '../../storageKeys';

/**
 * Feature: nurse-management
 * Property 17: Legacy persistence, failure atomicity, and store independence
 *
 * For arbitrary legacy initialization states and camelCase nurse collections,
 * initialization preserves the established seven-sample/existing-data rules and
 * successful writes round-trip exactly. Storage failures must be explicit and
 * atomic, must preserve the submitted draft and last successful collection, and
 * must never invoke Supabase. Distinct remote and local datasets remain separate
 * across mode-specific startup.
 *
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9**
 */

const h = vi.hoisted(() => {
  const success = (data = null) => ({ data, error: null });
  return {
    supabaseAdapter: {
      list: vi.fn(async () => ({ ...success([]), page: 1, pageSize: 25, total: 0 })),
      getById: vi.fn(async () => success()),
      create: vi.fn(async () => success()),
      update: vi.fn(async () => success()),
      remove: vi.fn(async () => ({ error: null })),
      bulkUpsert: vi.fn(async () => success([])),
      bulkUpdate: vi.fn(async () => success([])),
      getCollection: vi.fn(async () => success([])),
      saveCollection: vi.fn(async (_name, value) => success(value)),
    },
  };
});

vi.mock('../../featureFlags', () => ({
  isFeatureEnabled: () => false,
  FEATURE_FLAGS: { SUPABASE_BACKEND: 'SUPABASE_BACKEND' },
}));

vi.mock('../supabaseAdapter', () => h.supabaseAdapter);

const nurseArbitrary = (prefix) =>
  fc
    .record({
      token: fc.uuid(),
      fullName: fc.string({ minLength: 1, maxLength: 40 }),
      preferredName: fc.string({ maxLength: 20 }),
      pipelineStage: fc.constantFrom('Applied', 'Screening', 'Training Active'),
      readinessStatus: fc.string({ maxLength: 20 }),
      flags: fc.integer({ min: 0, max: 5 }),
      agreementSigned: fc.boolean(),
      scorecardFields: fc.record({
        hospitalExp: fc.integer({ min: 0, max: 5 }),
        sancStatus: fc.integer({ min: 0, max: 5 }),
        qualifications: fc.integer({ min: 0, max: 5 }),
        specialisation: fc.integer({ min: 0, max: 5 }),
        financialReadiness: fc.integer({ min: 0, max: 5 }),
        motivation: fc.integer({ min: 0, max: 5 }),
        passport: fc.integer({ min: 0, max: 5 }),
      }),
      additionalCertifications: fc.array(fc.string({ maxLength: 30 }), {
        maxLength: 3,
      }),
      communicationLog: fc.array(
        fc.record({
          date: fc.string({ maxLength: 12 }),
          channel: fc.constantFrom('Email', 'Phone', 'WhatsApp'),
          summary: fc.string({ maxLength: 40 }),
        }),
        { maxLength: 3 },
      ),
    })
    .map(({ token, ...nurse }) => ({ id: `${prefix}-${token}`, ...nurse }));

const localCollectionArbitrary = fc.array(nurseArbitrary('local'), {
  minLength: 1,
  maxLength: 6,
});
const remoteCollectionArbitrary = fc.array(nurseArbitrary('remote'), {
  minLength: 1,
  maxLength: 6,
});
const initializationArbitrary = fc.oneof(
  fc.constant({ kind: 'missing', nurses: null }),
  fc.constant({ kind: 'empty', nurses: [] }),
  localCollectionArbitrary.map((nurses) => ({ kind: 'existing', nurses })),
);

function totalSupabaseCalls() {
  return Object.values(h.supabaseAdapter).reduce(
    (total, operation) => total + operation.mock.calls.length,
    0,
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Property 17: Legacy persistence, failure atomicity, and store independence', () => {
  it('preserves legacy initialization, exact round trips, atomic failures, and independent stores', async () => {
    const facade = await import('../index.js');

    await fc.assert(
      fc.asyncProperty(
        initializationArbitrary,
        localCollectionArbitrary,
        remoteCollectionArbitrary,
        async (initialization, nextLocalNurses, remoteNurses) => {
          localStorage.clear();
          vi.clearAllMocks();

          if (initialization.kind !== 'missing') {
            setData('nurses', initialization.nurses);
          }

          initializeApplicationStorage(false);

          const expectedInitialized =
            initialization.kind === 'existing' ? initialization.nurses : seedNurses();
          expect(getNurses()).toEqual(expectedInitialized);
          if (initialization.kind !== 'existing') {
            expect(getNurses()).toHaveLength(7);
          }

          const persisted = await facade.saveCollection('nurses', nextLocalNurses);
          expect(persisted.error).toBeNull();
          expect(getNurses()).toEqual(nextLocalNurses);

          const lastSuccessful = clone(getNurses());
          const remoteBeforeModeChanges = clone(remoteNurses);

          initializeApplicationStorage(true);
          initializeApplicationStorage(false);

          expect(getNurses()).toEqual(lastSuccessful);
          expect(remoteNurses).toEqual(remoteBeforeModeChanges);
          expect(getNurses().every(({ id }) => id.startsWith('local-'))).toBe(true);
          expect(remoteNurses.every(({ id }) => id.startsWith('remote-'))).toBe(true);

          const failedDraft = nextLocalNurses.map((nurse) => ({
            ...nurse,
            fullName: `${nurse.fullName} unsaved`,
          }));
          const failedDraftBefore = clone(failedDraft);
          const issues = [];
          const originalSetItem = localStorage.setItem.bind(localStorage);
          const originalGetItem = localStorage.getItem.bind(localStorage);
          const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

          const setItemFailure = vi
            .spyOn(localStorage, 'setItem')
            .mockImplementation((key, value) => {
              if (key === `${STORAGE_PREFIX}nurses`) {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
              }
              return originalSetItem(key, value);
            });
          const failedWrite = await facade.saveCollection('nurses', failedDraft);
          setItemFailure.mockRestore();

          expect(failedDraft).toEqual(failedDraftBefore);
          expect(getNurses()).toEqual(lastSuccessful);
          if (failedWrite.error == null) {
            issues.push('localStorage write failure was reported as success');
          }

          const getItemFailure = vi
            .spyOn(localStorage, 'getItem')
            .mockImplementation((key) => {
              if (key === `${STORAGE_PREFIX}nurses`) {
                throw new DOMException('Storage access denied', 'SecurityError');
              }
              return originalGetItem(key);
            });
          const failedRead = await facade.getCollection('nurses');
          getItemFailure.mockRestore();
          consoleError.mockRestore();

          expect(getNurses()).toEqual(lastSuccessful);
          if (failedRead.error == null) {
            issues.push('localStorage read failure was reported as success');
          }

          expect(totalSupabaseCalls()).toBe(0);
          expect(issues).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
