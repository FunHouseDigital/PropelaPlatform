import { describe, expect, it } from 'vitest';

import { assertAsyncProperty, fc } from '../../../test/pbt';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseRepository } from '../nurseRepository';
import {
  createBlankNurseDraft,
  normalizeNurseCreateDraft,
  NURSE_BUSINESS_FIELDS,
} from '../nurseWorkflow';

const COMMITTED_AT = '2026-03-10T12:00:00.000Z';

const nonEmptyTextArbitrary = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '), {
    minLength: 1,
    maxLength: 30,
  })
  .map((characters) => characters.join('').trim() || 'Nurse');

const draftValuesArbitrary = fc.record({
  fullName: nonEmptyTextArbitrary,
  preferredName: fc.string({ maxLength: 30 }),
  flags: fc.integer({ min: 0, max: 20 }),
  englishPts: fc.integer({ min: 0, max: 3 }),
  additionalCertifications: fc.array(nonEmptyTextArbitrary, { maxLength: 3 }),
});

const distinctUuidPairArbitrary = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([first, second]) => first !== second);

const distinctOwnerPairArbitrary = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([first, second]) => first !== second);

const ambiguityArbitrary = fc.constantFrom('network', 'unknown', 'missing-response');
const collisionKindArbitrary = fc.constantFrom('different-owner', 'different-business-values');

function createDraft(uuid, values) {
  return {
    ...createBlankNurseDraft({
      now: new Date(COMMITTED_AT),
      randomUUID: () => uuid,
    }),
    ...values,
  };
}

function normalizeDraft(draft) {
  const normalized = normalizeNurseCreateDraft(draft);
  expect(normalized.valid).toBe(true);
  return normalized.value;
}

function committedNurse(draft, ownerId) {
  return {
    ...draft,
    ownerId,
    version: 1,
    createdAt: COMMITTED_AT,
    updatedAt: COMMITTED_AT,
  };
}

function ambiguousResponse(kind) {
  if (kind === 'network') {
    return { data: null, error: new DataError(DataErrorCode.NETWORK) };
  }
  if (kind === 'unknown') {
    return { data: null, error: new DataError(DataErrorCode.UNKNOWN) };
  }
  return { data: null, error: null };
}

function activeSession(ownerId) {
  return {
    session: {
      user: { id: ownerId },
      access_token: 'property-test-session',
      expires_at: 4_102_444_800,
    },
    error: null,
  };
}

function createRepository(operations, ownerId) {
  return createNurseRepository({
    operations,
    supabase: true,
    requireActiveSession: async () => activeSession(ownerId),
    sessionExpired: () => false,
  });
}

function readOperation(store, events) {
  return async (id) => {
    events.push({ type: 'read', id });
    const nurse = store.get(id);
    return nurse
      ? { data: nurse, error: null }
      : { data: null, error: null, notFound: true };
  };
}

function listOperation(store) {
  return async ({ page, pageSize }) => {
    const nurses = [...store.values()];
    return {
      data: nurses.slice((page - 1) * pageSize, page * pageSize),
      error: null,
      total: nurses.length,
    };
  };
}

function businessValuesMatch(nurse, draft) {
  return NURSE_BUSINESS_FIELDS.every(
    (field) => JSON.stringify(nurse[field]) === JSON.stringify(draft[field])
  );
}

/**
 * Property 7: Ambiguous create retry is idempotent.
 *
 * **Validates: Requirements 3.3, 3.8–3.12, and 3.14**
 */
describe('Property 7: Ambiguous create retry is idempotent', () => {
  it('reads a stable draft identity and accepts a matching ambiguous commit without reinserting', async () => {
    await assertAsyncProperty(
      [fc.uuid(), fc.uuid(), draftValuesArbitrary, ambiguityArbitrary],
      async (draftUuid, ownerId, draftValues, ambiguity) => {
        const draft = createDraft(draftUuid, draftValues);
        const draftSnapshot = structuredClone(draft);
        const normalized = normalizeDraft(draft);
        const committed = committedNurse(normalized, ownerId);
        const store = new Map();
        const events = [];
        let insertCount = 0;

        const operations = {
          list: listOperation(store),
          get: readOperation(store, events),
          create: async (submittedDraft, identity) => {
            events.push({ type: 'insert', id: identity.id });
            insertCount += 1;
            expect(identity).toEqual({ id: draft.id, ownerId });
            expect(submittedDraft.id).toBe(draft.id);
            store.set(identity.id, committed);
            return ambiguousResponse(ambiguity);
          },
        };
        const repository = createRepository(operations, ownerId);

        const ambiguousResult = await repository.create(draft);
        const retryResult = await repository.create(draft, { retry: true, retryCount: 1 });
        const refreshed = await repository.listAll();

        expect(ambiguousResult).toMatchObject({ status: 'error' });
        expect(retryResult).toEqual({ status: 'saved', nurse: committed });
        expect(events).toEqual([
          { type: 'insert', id: draft.id },
          { type: 'read', id: draft.id },
        ]);
        expect(insertCount).toBe(1);
        expect(draft).toEqual(draftSnapshot);
        expect(retryResult.nurse.id).toBe(draftSnapshot.id);
        expect(refreshed).toMatchObject({ status: 'ok', total: 1 });
        expect(refreshed.nurses.filter((nurse) => nurse.id === draft.id)).toEqual([committed]);
        expect(
          refreshed.nurses.filter(
            (nurse) => nurse.ownerId === ownerId && businessValuesMatch(nurse, normalized)
          )
        ).toHaveLength(1);
      }
    );
  });

  it('does not insert over a genuine collision and commits one unchanged draft under one fresh explicit ID', async () => {
    await assertAsyncProperty(
      [
        distinctUuidPairArbitrary,
        distinctOwnerPairArbitrary,
        draftValuesArbitrary,
        ambiguityArbitrary,
        collisionKindArbitrary,
      ],
      async (
        [originalUuid, freshUuid],
        [ownerId, otherOwnerId],
        draftValues,
        ambiguity,
        collisionKind
      ) => {
        const originalDraft = createDraft(originalUuid, draftValues);
        const originalSnapshot = structuredClone(originalDraft);
        const normalizedOriginal = normalizeDraft(originalDraft);
        const store = new Map();
        const events = [];
        let insertCount = 0;

        const collision = committedNurse(
          collisionKind === 'different-business-values'
            ? { ...normalizedOriginal, fullName: `${normalizedOriginal.fullName} collision` }
            : normalizedOriginal,
          collisionKind === 'different-owner' ? otherOwnerId : ownerId
        );

        const operations = {
          list: listOperation(store),
          get: readOperation(store, events),
          create: async (submittedDraft, identity) => {
            events.push({ type: 'insert', id: identity.id });
            insertCount += 1;
            if (identity.id === originalDraft.id) {
              store.set(identity.id, collision);
              return ambiguousResponse(ambiguity);
            }
            const saved = committedNurse(submittedDraft, identity.ownerId);
            store.set(identity.id, saved);
            return { data: saved, error: null };
          },
        };
        const repository = createRepository(operations, ownerId);

        const ambiguousResult = await repository.create(originalDraft);
        const collisionResult = await repository.create(originalDraft, {
          retry: true,
          retryCount: 1,
        });

        const freshDraft = { ...originalDraft, id: `nurse-${freshUuid}` };
        const freshSnapshot = structuredClone(freshDraft);
        const normalizedFresh = normalizeDraft(freshDraft);
        const savedResult = await repository.create(freshDraft, { retryCount: 2 });
        const refreshed = await repository.listAll();

        expect(ambiguousResult).toMatchObject({ status: 'error' });
        expect(collisionResult).toMatchObject({
          status: 'collision',
          current: collision,
          error: { code: DataErrorCode.CONFLICT },
        });
        expect(savedResult).toMatchObject({
          status: 'saved',
          nurse: { id: freshDraft.id, ownerId },
        });
        expect(events).toEqual([
          { type: 'insert', id: originalDraft.id },
          { type: 'read', id: originalDraft.id },
          { type: 'read', id: freshDraft.id },
          { type: 'insert', id: freshDraft.id },
        ]);
        expect(insertCount).toBe(2);
        expect(originalDraft).toEqual(originalSnapshot);
        expect(freshDraft).toEqual(freshSnapshot);
        expect(freshDraft).toEqual({ ...originalDraft, id: `nurse-${freshUuid}` });
        expect(refreshed).toMatchObject({ status: 'ok', total: 2 });
        expect(refreshed.nurses.filter((nurse) => nurse.id === freshDraft.id)).toHaveLength(1);
        expect(
          refreshed.nurses.filter(
            (nurse) => nurse.ownerId === ownerId && businessValuesMatch(nurse, normalizedFresh)
          )
        ).toHaveLength(1);
      }
    );
  });
});
