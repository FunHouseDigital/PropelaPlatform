import { describe, expect, it, vi } from 'vitest';

import { assertAsyncProperty, fc } from '../../../test/pbt';
import { calculateReadinessStatus } from '../../calculations';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseRepository } from '../nurseRepository';
import {
  createBlankNurseDraft,
  isNurseDraftId,
  normalizeNurseCreateDraft,
  NURSE_BUSINESS_FIELDS,
  SCORECARD_FIELD_NAMES,
} from '../nurseWorkflow';

const nameArbitrary = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '), {
    minLength: 1,
    maxLength: 40,
  })
  .map((characters) => characters.join('').trim())
  .filter((name) => name.length > 0);

const confirmedStateArbitrary = fc.array(
  fc.record({
    id: fc.uuid().map((uuid) => `nurse-${uuid}`),
    fullName: nameArbitrary,
    version: fc.integer({ min: 1, max: 10_000 }),
  }),
  { maxLength: 6 }
);

const createCaseArbitrary = fc.record({
  draftUuid: fc.uuid(),
  ownerId: fc.uuid(),
  fullName: nameArbitrary,
  year: fc.integer({ min: 2020, max: 2040 }),
  month: fc.integer({ min: 1, max: 12 }),
  day: fc.integer({ min: 1, max: 28 }),
  version: fc.integer({ min: 1, max: 10_000 }),
  timestamp: fc.integer({ min: 1_577_836_800_000, max: 2_239_920_000_000 }),
  confirmed: confirmedStateArbitrary,
});

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function expectedBlankBusinessValues(submittedAt) {
  return {
    fullName: '',
    preferredName: '',
    pipelineStage: 'Applied',
    readinessStatus: calculateReadinessStatus('Applied'),
    cohortAssigned: '',
    oetStatus: 'Not Started',
    finalScore: 0,
    tier: '',
    email: '',
    scorecardFields: Object.fromEntries(SCORECARD_FIELD_NAMES.map((field) => [field, 0])),
    additionalCertifications: [],
    communicationLog: [],
    nextAction: '',
    flags: 0,
    contactNumber: '',
    gender: '',
    ageGroup: '',
    province: '',
    city: '',
    registeredWithSANC: '',
    registeredNurseInSA: '',
    sancNumber: '',
    sancAPCExpiry: '',
    sancAPCStatus: '',
    highestQualification: '',
    qualificationInstitution: '',
    yearsOfClinicalExperience: '',
    primaryClinicalSpecialty: '',
    employmentStatus: '',
    currentEmployer: '',
    validPassport: '',
    passportExpiryDate: '',
    efSetScore: 0,
    efSetLevel: '',
    englishPts: 0,
    cvScore: 0,
    shortlistDecision: '',
    agreementSigned: false,
    commitmentFeeStatus: '',
    source: '',
    motivations: '',
    questions: '',
    notesFlags: '',
    photoURL: '',
    submittedAt,
    nextActionDueDate: '',
    lastContacted: '',
  };
}

function activeSession(ownerId) {
  return {
    session: {
      user: { id: ownerId },
      access_token: 'property-test-session',
    },
    error: null,
  };
}

function applyConfirmedCreate(confirmed, result) {
  return result?.status === 'saved' ? [...confirmed, result.nurse] : confirmed;
}

describe('Property 6: Create identity, ownership, defaults, and confirmation', () => {
  // **Validates: Requirements 3.2–3.6 and 3.13**
  it('keeps blank drafts seed-free and stable, derives ownership from auth, and confirms only returned rows', async () => {
    await assertAsyncProperty(
      createCaseArbitrary,
      async ({ draftUuid, ownerId, fullName, year, month, day, version, timestamp, confirmed }) => {
        const randomUUID = vi.fn(() => draftUuid);
        const submittedAt = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const blankDraft = createBlankNurseDraft({
          now: new Date(year, month - 1, day, 12),
          randomUUID,
        });
        const expectedBusinessValues = expectedBlankBusinessValues(submittedAt);

        expect(randomUUID).toHaveBeenCalledTimes(1);
        expect(blankDraft.id).toBe(`nurse-${draftUuid}`);
        expect(isNurseDraftId(blankDraft.id)).toBe(true);
        expect(blankDraft).toEqual({ id: `nurse-${draftUuid}`, ...expectedBusinessValues });
        expect(Object.keys(blankDraft).sort()).toEqual(
          ['id', ...NURSE_BUSINESS_FIELDS].sort()
        );

        const submittedDraft = { ...blankDraft, fullName };
        const submittedSnapshot = structuredClone(submittedDraft);
        const normalized = normalizeNurseCreateDraft(submittedDraft);
        expect(normalized.valid).toBe(true);
        expect(normalized.value.id).toBe(blankDraft.id);
        expect(randomUUID).toHaveBeenCalledTimes(1);

        const createdAt = new Date(timestamp).toISOString();
        const updatedAt = new Date(timestamp + 1_000).toISOString();
        const committedNurse = {
          ...normalized.value,
          ownerId,
          version,
          createdAt,
          updatedAt,
        };
        const response = deferred();
        const requestIssued = deferred();
        const createRequest = vi.fn((requestDraft, identity) => {
          requestIssued.resolve({ requestDraft, identity });
          return response.promise;
        });
        const repository = createNurseRepository({
          operations: {
            create: createRequest,
            get: vi.fn(async () => ({ data: null, error: null, notFound: true })),
          },
          supabase: true,
          readSession: vi.fn(async () => activeSession(ownerId)),
          sessionExpired: () => false,
        });
        const confirmedBefore = structuredClone(confirmed);

        const pendingCreate = repository.create(submittedDraft);
        const issued = await requestIssued.promise;

        expect(issued.requestDraft).toEqual(normalized.value);
        expect(issued.requestDraft.id).toBe(blankDraft.id);
        expect(issued.identity).toEqual({ id: blankDraft.id, ownerId });
        expect(submittedDraft).toEqual(submittedSnapshot);
        expect(confirmed).toEqual(confirmedBefore);
        expect(randomUUID).toHaveBeenCalledTimes(1);

        response.resolve({ data: committedNurse, error: null });
        const saved = await pendingCreate;
        const confirmedAfterSave = applyConfirmedCreate(confirmed, saved);

        expect(saved).toEqual({ status: 'saved', nurse: committedNurse });
        expect(saved.nurse).toBe(committedNurse);
        expect(confirmedAfterSave).toEqual([...confirmedBefore, committedNurse]);
        expect(confirmedAfterSave.at(-1)).toBe(committedNurse);
        expect(confirmedAfterSave.at(-1)).toMatchObject({
          id: blankDraft.id,
          ownerId,
          version,
          createdAt,
          updatedAt,
        });
        expect(createRequest).toHaveBeenCalledTimes(1);

        const failedCreate = vi.fn(async () => ({
          data: null,
          error: new DataError(DataErrorCode.NETWORK),
        }));
        const failedRepository = createNurseRepository({
          operations: {
            create: failedCreate,
            get: vi.fn(async () => ({ data: null, error: null, notFound: true })),
          },
          supabase: true,
          readSession: vi.fn(async () => activeSession(ownerId)),
          sessionExpired: () => false,
        });
        const failed = await failedRepository.create(submittedDraft);
        expect(failed).toMatchObject({ status: 'error', error: { code: DataErrorCode.NETWORK } });
        expect(applyConfirmedCreate(confirmed, failed)).toBe(confirmed);

        const unauthenticatedCreate = vi.fn();
        const unauthenticatedRepository = createNurseRepository({
          operations: {
            create: unauthenticatedCreate,
            get: vi.fn(),
          },
          supabase: true,
          readSession: vi.fn(async () => ({ session: null, error: null })),
          sessionExpired: () => false,
        });
        const unauthenticated = await unauthenticatedRepository.create(submittedDraft);

        expect(unauthenticated).toMatchObject({
          status: 'error',
          error: { code: DataErrorCode.AUTH },
        });
        expect(unauthenticatedCreate).not.toHaveBeenCalled();
        expect(applyConfirmedCreate(confirmed, unauthenticated)).toBe(confirmed);
        expect(submittedDraft).toEqual(submittedSnapshot);
      },
      { numRuns: 100 }
    );
  });
});
