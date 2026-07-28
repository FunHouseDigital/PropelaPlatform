import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { createNurseController, NurseAsyncState } from '../nurseController';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const NUM_RUNS = 100;
const CREATED_AT = '2026-03-10T12:00:00.000Z';
const UPDATED_AT = '2026-03-11T12:00:00.000Z';
const NAME_CHARACTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];

const safeNameArb = fc
  .array(fc.constantFrom(...NAME_CHARACTERS), { minLength: 1, maxLength: 40 })
  .map((characters) => characters.join(''));

const successfulUpdateArb = fc
  .record({
    ids: fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 }),
    targetIndexSeed: fc.nat(),
    baseVersion: fc.integer({ min: 1, max: 1_000_000 }),
    versionAdvance: fc.integer({ min: 1, max: 1_000 }),
    originalName: safeNameArb,
    editedName: safeNameArb,
    ownerId: fc.uuid(),
  })
  .filter(({ originalName, editedName }) => originalName !== editedName)
  .map((generated) => ({
    ...generated,
    targetIndex: generated.targetIndexSeed % generated.ids.length,
  }));

function authoritativeNurse({ id, fullName, ownerId, version, updatedAt = CREATED_AT }) {
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
    ownerId,
    version,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function repositoryFor(initialNurses, target, committed) {
  return {
    listAll: vi.fn(async () => ({
      status: 'ok',
      nurses: structuredClone(initialNurses),
      total: initialNurses.length,
    })),
    get: vi.fn(async (id) =>
      id === target.id
        ? { status: 'ok', nurse: structuredClone(target) }
        : { status: 'notFound' },
    ),
    create: vi.fn(),
    save: vi.fn(async () => ({ status: 'saved', nurse: structuredClone(committed) })),
    remove: vi.fn(),
  };
}

describe('Property 11: Successful update advances the authoritative version', () => {
  // **Validates: Requirements 6.6, 6.7**
  it('replaces matching list and detail values and adopts the greater returned version', async () => {
    await fc.assert(
      fc.asyncProperty(successfulUpdateArb, async (generated) => {
        const returnedVersion = generated.baseVersion + generated.versionAdvance;
        const initialNurses = generated.ids.map((id, index) =>
          authoritativeNurse({
            id,
            fullName:
              index === generated.targetIndex ? generated.originalName : `Bystander${index}`,
            ownerId: generated.ownerId,
            version: index === generated.targetIndex ? generated.baseVersion : index + 1,
          }),
        );
        const target = initialNurses[generated.targetIndex];
        const committed = {
          ...target,
          fullName: generated.editedName,
          version: returnedVersion,
          updatedAt: UPDATED_AT,
        };
        const repository = repositoryFor(initialNurses, target, committed);
        const controller = createNurseController({ repository });

        await controller.refreshNurses();
        await controller.openNurse(target.id);
        controller.updateDraft({ fullName: generated.editedName });
        const result = await controller.saveNurse();

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save.mock.calls[0][0]).toBe(target.id);
        expect(repository.save.mock.calls[0][1]).toMatchObject({
          id: target.id,
          fullName: generated.editedName,
          version: generated.baseVersion,
        });
        expect(repository.save.mock.calls[0][2]).toBe(generated.baseVersion);
        expect(returnedVersion).toBeGreaterThan(generated.baseVersion);
        expect(result).toEqual({ status: 'saved', nurse: committed });

        const expectedItems = initialNurses.map((nurse, index) =>
          index === generated.targetIndex ? committed : nurse,
        );
        const state = controller.getState();
        expect(state.items).toEqual(expectedItems);
        expect(state.items.filter((nurse) => nurse.id === target.id)).toEqual([committed]);
        expect(state.total).toBe(initialNurses.length);
        expect(state.selected).toEqual(committed);
        expect(state.originalBase).toEqual(committed);
        expect(state.draft).toEqual(committed);
        expect(state.baseVersion).toBe(returnedVersion);
        expect(state.saveState).toBe(NurseAsyncState.SUCCESS);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
