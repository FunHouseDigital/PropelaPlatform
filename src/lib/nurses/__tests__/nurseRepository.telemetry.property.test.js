import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../dataLayer/errors';
import {
  createNurseRepository,
  NURSE_OPERATION_EVENT_KEYS,
} from '../nurseRepository';
import {
  createBlankNurseDraft,
  normalizeNurseCreateDraft,
} from '../nurseWorkflow';

/**
 * Property 19: Privacy-safe operation telemetry
 *
 * For any nurse operation and arbitrary Nurse payload or raw failure, emitted
 * telemetry contains only allowlisted operation metadata and sanitized values.
 *
 * **Validates: Requirements 9.12**
 */

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const OPERATIONS = ['list', 'detail', 'create', 'update', 'delete'];
const OUTCOMES = [
  'success',
  'empty',
  'validation',
  'auth',
  'forbidden',
  'network',
  'conflict',
  'notFound',
  'unknown',
];
const BACKENDS = ['supabase', 'legacy'];
const FAILURE_OUTCOME = Object.freeze({
  [DataErrorCode.NETWORK]: 'network',
  [DataErrorCode.AUTH]: 'auth',
  [DataErrorCode.FORBIDDEN]: 'forbidden',
  [DataErrorCode.VALIDATION]: 'validation',
  [DataErrorCode.UNKNOWN]: 'unknown',
});

const safeNameArbitrary = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '), {
    minLength: 1,
    maxLength: 40,
  })
  .map((characters) => characters.join('').trim() || 'Nurse');

const safeRequestIdArbitrary = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-'), {
    minLength: 1,
    maxLength: 64,
  })
  .map((characters) => characters.join(''));

const telemetryCaseArbitrary = fc.record({
  operation: fc.constantFrom(...OPERATIONS),
  supabase: fc.boolean(),
  nurseUuid: fc.uuid(),
  safeName: safeNameArbitrary,
  sensitive: fc.record({
    fullName: fc.string({ minLength: 1, maxLength: 80 }),
    email: fc.emailAddress(),
    contactNumber: fc.string({ minLength: 1, maxLength: 40 }),
    clinicalData: fc.array(fc.string({ maxLength: 80 }), { maxLength: 5 }),
    communicationContent: fc.string({ minLength: 1, maxLength: 200 }),
    accessToken: fc.string({ minLength: 1, maxLength: 100 }),
    session: fc.string({ minLength: 1, maxLength: 100 }),
    ownerId: fc.uuid(),
    rawError: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  failureCode: fc.constantFrom(
    DataErrorCode.NETWORK,
    DataErrorCode.AUTH,
    DataErrorCode.FORBIDDEN,
    DataErrorCode.VALIDATION,
    DataErrorCode.UNKNOWN,
  ),
  retryCount: fc.oneof(
    fc.integer({ min: 0, max: 10_000 }),
    fc.integer({ min: -10_000, max: -1 }),
    fc.string({ maxLength: 30 }),
    fc.boolean(),
    fc.constant(null),
    fc.constant(Number.NaN),
    fc.constant(Infinity),
  ),
  requestId: fc.oneof(
    safeRequestIdArbitrary.map((value) => ({ kind: 'safe', value })),
    fc.string({ maxLength: 80 }).map((value) => ({
      kind: 'unsafe',
      value: `${value}@private/request`,
    })),
  ),
  elapsed: fc.oneof(
    fc.integer({ min: -10_000, max: 10_000 }),
    fc.constant(Number.NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity),
  ),
});

function activeSession() {
  return {
    session: {
      user: { id: OWNER_ID },
      access_token: 'session-token-that-must-not-be-emitted',
      expires_at: 4_102_444_800,
    },
    error: null,
  };
}

function makeClock(elapsed) {
  let calls = 0;
  return () => {
    calls += 1;
    return calls === 1 ? 1_000 : 1_000 + elapsed;
  };
}

function makeNurse(generated) {
  return {
    id: `nurse-${generated.nurseUuid}`,
    fullName: generated.sensitive.fullName,
    email: generated.sensitive.email,
    contactNumber: generated.sensitive.contactNumber,
    clinicalData: generated.sensitive.clinicalData,
    communicationLog: [{ summary: generated.sensitive.communicationContent }],
    accessToken: generated.sensitive.accessToken,
    session: generated.sensitive.session,
    ownerId: generated.sensitive.ownerId,
    version: 2,
  };
}

function makeDraft(generated) {
  return {
    ...createBlankNurseDraft({
      now: new Date('2026-03-10T12:00:00.000Z'),
      randomUUID: () => generated.nurseUuid,
    }),
    fullName: generated.safeName,
  };
}

function makeCommittedCreateNurse(draft, generated) {
  const normalized = normalizeNurseCreateDraft(draft);
  if (!normalized.valid) throw new Error('Generated create draft must be valid.');

  return {
    ...normalized.value,
    ownerId: generated.supabase ? OWNER_ID : generated.sensitive.ownerId,
    version: 1,
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
  };
}

function makeOperations(nurse, failure = null) {
  const failed = () => ({ data: null, error: failure });
  return {
    list: vi.fn(async () =>
      failure ? failed() : { data: [nurse], error: null, total: 1 },
    ),
    get: vi.fn(async () =>
      failure ? failed() : { data: nurse, error: null, notFound: false },
    ),
    create: vi.fn(async () => (failure ? failed() : { data: nurse, error: null })),
    update: vi.fn(async () => (failure ? failed() : { data: nurse, error: null })),
    remove: vi.fn(async () =>
      failure
        ? { error: failure }
        : { error: null, deleted: true, outcome: 'deleted' },
    ),
  };
}

function invoke(repository, operation, draft, options) {
  switch (operation) {
    case 'list':
      return repository.listAll(options);
    case 'detail':
      return repository.get(draft.id, options);
    case 'create':
      return repository.create(draft, options);
    case 'update':
      return repository.save(draft.id, { fullName: draft.fullName }, 1, options);
    case 'delete':
      return repository.remove(draft.id, 1, options);
    default:
      throw new Error(`Unsupported generated operation: ${operation}`);
  }
}

function expectedOperationName(operation) {
  return operation === 'update' ? 'update' : operation;
}

function expectedDuration(elapsed) {
  return Number.isFinite(elapsed) ? Math.max(0, Math.round(elapsed)) : 0;
}

function assertPrivacySafeEvent(event, generated, outcome) {
  const expected = {
    operation: expectedOperationName(generated.operation),
    outcome,
    backend: generated.supabase ? 'supabase' : 'legacy',
    durationMs: expectedDuration(generated.elapsed),
    retryCount:
      Number.isInteger(generated.retryCount) && generated.retryCount >= 0
        ? generated.retryCount
        : 0,
  };
  if (
    generated.requestId.kind === 'safe' &&
    SAFE_REQUEST_ID_PATTERN.test(generated.requestId.value)
  ) {
    expected.requestId = generated.requestId.value;
  }

  expect(event).toEqual(expected);
  expect(Object.keys(event).every((key) => NURSE_OPERATION_EVENT_KEYS.includes(key))).toBe(true);
  expect(Object.keys(event).sort()).toEqual(Object.keys(expected).sort());
  expect(OPERATIONS).toContain(event.operation);
  expect(OUTCOMES).toContain(event.outcome);
  expect(BACKENDS).toContain(event.backend);
  expect(Number.isSafeInteger(event.durationMs)).toBe(true);
  expect(event.durationMs).toBeGreaterThanOrEqual(0);
  expect(Number.isSafeInteger(event.retryCount)).toBe(true);
  expect(event.retryCount).toBeGreaterThanOrEqual(0);
  expect(event).not.toHaveProperty('nurse');
  expect(event).not.toHaveProperty('payload');
  expect(event).not.toHaveProperty('error');
  expect(event).not.toHaveProperty('cause');
  expect(event).not.toHaveProperty('id');
  expect(event).not.toHaveProperty('ownerId');
  expect(event).not.toHaveProperty('fullName');
  expect(event).not.toHaveProperty('email');
  expect(event).not.toHaveProperty('contactNumber');
  expect(event).not.toHaveProperty('clinicalData');
  expect(event).not.toHaveProperty('communicationLog');
  expect(event).not.toHaveProperty('accessToken');
  expect(event).not.toHaveProperty('session');
  expect(Object.isFrozen(event)).toBe(true);
}

function repositoryFor(generated, operations, events) {
  return createNurseRepository({
    operations,
    supabase: generated.supabase,
    readSession: vi.fn(async () => activeSession()),
    sessionExpired: () => false,
    emitOperation: (event) => events.push(event),
    now: makeClock(generated.elapsed),
  });
}

describe('Property 19: Privacy-safe operation telemetry', () => {
  it('allowlists and sanitizes metadata for generated sensitive successes and failures', async () => {
    await fc.assert(
      fc.asyncProperty(telemetryCaseArbitrary, async (generated) => {
        const nurse = makeNurse(generated);
        const draft = makeDraft(generated);
        // A generated create retry reads before inserting. Model a successful
        // ambiguous commit with the normalized draft's business values so the
        // repository correctly recognizes it as the same create, not a collision.
        const successNurse =
          generated.operation === 'create'
            ? makeCommittedCreateNurse(draft, generated)
            : nurse;
        const rawFailure = {
          message: generated.sensitive.rawError,
          nurse,
          token: generated.sensitive.accessToken,
          session: generated.sensitive.session,
        };
        const failure = new DataError(
          generated.failureCode,
          generated.sensitive.rawError,
          rawFailure,
        );
        const options = {
          retryCount: generated.retryCount,
          requestId: generated.requestId.value,
          nurse,
          payload: generated.sensitive,
          error: rawFailure,
          token: generated.sensitive.accessToken,
          session: generated.sensitive.session,
        };

        const successEvents = [];
        const successRepository = repositoryFor(
          generated,
          makeOperations(successNurse),
          successEvents,
        );
        await invoke(successRepository, generated.operation, draft, options);

        expect(successEvents).toHaveLength(1);
        assertPrivacySafeEvent(successEvents[0], generated, 'success');

        const failureEvents = [];
        const failureRepository = repositoryFor(
          generated,
          makeOperations(nurse, failure),
          failureEvents,
        );
        await invoke(failureRepository, generated.operation, draft, options);

        expect(failureEvents).toHaveLength(1);
        assertPrivacySafeEvent(
          failureEvents[0],
          generated,
          FAILURE_OUTCOME[generated.failureCode],
        );
      }),
      { numRuns: 100 },
    );
  });
});
