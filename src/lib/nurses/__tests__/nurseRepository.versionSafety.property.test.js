import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { calculateReadinessStatus } from '../../calculations';
import { PIPELINE_STAGES } from '../../constants';
import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseRepository } from '../nurseRepository';

const NUM_RUNS = 100;
const RECOVERABLE_CODES = new Set([DataErrorCode.NETWORK, DataErrorCode.UNKNOWN]);

const invalidIdentifierArb = fc.constantFrom('', ' ', '\t', null, undefined);
const invalidVersionArb = fc.constantFrom(undefined, null, 0, -1, -100, 1.5, '1');
const errorCodeArb = fc.constantFrom(
  DataErrorCode.NETWORK,
  DataErrorCode.AUTH,
  DataErrorCode.FORBIDDEN,
  DataErrorCode.VALIDATION,
  DataErrorCode.UNKNOWN,
);

const mutationCaseArb = fc
  .record({
    id: fc.uuid().map((uuid) => `nurse-${uuid}`),
    otherId: fc.uuid().map((uuid) => `nurse-${uuid}`),
    absentId: fc.uuid().map((uuid) => `missing-${uuid}`),
    version: fc.integer({ min: 1, max: 10_000 }),
    staleOffset: fc.integer({ min: 1, max: 100 }),
    originalName: fc.string({ minLength: 1, maxLength: 40 }),
    updatedName: fc.string({ minLength: 1, maxLength: 40 }),
    invalidIdentifier: invalidIdentifierArb,
    invalidVersion: invalidVersionArb,
  })
  .filter(({ id, otherId }) => id !== otherId);

const duplicateActivationArb = fc
  .record({
    id: fc.uuid().map((uuid) => `nurse-${uuid}`),
    version: fc.integer({ min: 1, max: 10_000 }),
    activation: fc.constantFrom('save', 'pipeline', 'delete'),
    updatedName: fc.string({ minLength: 1, maxLength: 40 }),
    pipelineStage: fc.constantFrom(...PIPELINE_STAGES),
  });

const pipelineFailureArb = fc
  .record({
    id: fc.uuid().map((uuid) => `nurse-${uuid}`),
    version: fc.integer({ min: 1, max: 10_000 }),
    priorStage: fc.constantFrom(...PIPELINE_STAGES),
    nextStage: fc.constantFrom(...PIPELINE_STAGES),
    priorReadiness: fc.string({ minLength: 1, maxLength: 60 }),
    failure: fc.oneof(
      fc.constant({ kind: 'conflict' }),
      errorCodeArb.map((code) => ({ kind: 'error', code })),
    ),
  })
  .filter(({ priorStage, nextStage }) => priorStage !== nextStage);

function clone(value) {
  return structuredClone(value);
}

function row({ id, version, fullName = 'Generated Nurse', ...overrides }) {
  return {
    id,
    version,
    fullName,
    preferredName: '',
    pipelineStage: 'Applied',
    readinessStatus: 'Not Ready',
    ...overrides,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createVersionedOperations(initialRows, { gate = null, updateOutcome = null } = {}) {
  const rows = new Map(initialRows.map((nurse) => [nurse.id, clone(nurse)]));

  const operations = {
    list: vi.fn(async () => ({ data: [], error: null, total: 0 })),
    get: vi.fn(async (id) => {
      const current = rows.get(id);
      return current
        ? { data: clone(current), error: null }
        : { data: null, error: null, notFound: true, outcome: 'notFound' };
    }),
    create: vi.fn(async () => ({ data: null, error: new DataError(DataErrorCode.UNKNOWN) })),
    update: vi.fn(async (id, patch, baseVersion) => {
      if (gate) await gate.promise;
      const current = rows.get(id);
      if (!current) {
        return { data: null, error: null, notFound: true, outcome: 'notFound' };
      }
      if (current.version !== baseVersion || updateOutcome?.kind === 'conflict') {
        return {
          data: null,
          error: null,
          conflict: { current: clone(current) },
          outcome: 'conflict',
        };
      }
      if (updateOutcome?.kind === 'error') {
        return {
          data: null,
          error: new DataError(updateOutcome.code),
        };
      }

      const committed = {
        ...current,
        ...clone(patch),
        id,
        version: current.version + 1,
      };
      rows.set(id, committed);
      return { data: clone(committed), error: null };
    }),
    remove: vi.fn(async (id, baseVersion) => {
      if (gate) await gate.promise;
      const current = rows.get(id);
      if (!current) {
        return { error: null, alreadyDeleted: true, outcome: 'alreadyDeleted' };
      }
      if (current.version !== baseVersion) {
        return {
          error: null,
          conflict: { current: clone(current) },
          outcome: 'conflict',
        };
      }
      rows.delete(id);
      return { error: null, deleted: true, outcome: 'deleted' };
    }),
  };

  return {
    operations,
    snapshot: () => Array.from(rows.values(), clone).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function repositoryFor(operations) {
  return createNurseRepository({ operations, supabase: false });
}

/**
 * Small execution model for the pending-mutation boundary owned by the nurse
 * workflow. Repository calls remain real; the model records the visible
 * optimistic pipeline pair so rollback can be checked independently.
 */
function createMutationSafetyModel(repository, initialRows) {
  const pending = new Map();
  const displayed = new Map(initialRows.map((nurse) => [nurse.id, clone(nurse)]));
  let pipelineDecision = null;

  function runOnce(key, operation) {
    if (pending.has(key)) return pending.get(key);
    const request = operation().finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  function save(id, draft, baseVersion) {
    return runOnce(`save:${id}`, () => repository.save(id, draft, baseVersion));
  }

  function remove(id, baseVersion) {
    return runOnce(`delete:${id}`, () => repository.remove(id, baseVersion));
  }

  function changePipeline(id, changes, baseVersion) {
    const key = `pipeline:${id}`;
    if (pending.has(key)) return pending.get(key);

    const previous = clone(displayed.get(id));
    displayed.set(id, { ...previous, ...clone(changes) });
    const request = repository
      .save(id, changes, baseVersion)
      .then((result) => {
        if (result.status === 'saved') {
          displayed.set(id, clone(result.nurse));
          pipelineDecision = null;
        } else {
          displayed.set(id, previous);
          pipelineDecision = {
            retryAvailable:
              result.status === 'error' && RECOVERABLE_CODES.has(result.error?.code),
            requiresReload: result.status === 'conflict',
          };
        }
        return result;
      })
      .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  return {
    changePipeline,
    displayed: (id) => clone(displayed.get(id)),
    pipelineDecision: () => clone(pipelineDecision),
    remove,
    save,
  };
}

function expectEveryWriteGated(operations) {
  for (const [id, _patch, baseVersion] of operations.update.mock.calls) {
    expect(typeof id).toBe('string');
    expect(id.trim().length).toBeGreaterThan(0);
    expect(Number.isInteger(baseVersion)).toBe(true);
    expect(baseVersion).toBeGreaterThan(0);
  }
  for (const [id, baseVersion] of operations.remove.mock.calls) {
    expect(typeof id).toBe('string');
    expect(id.trim().length).toBeGreaterThan(0);
    expect(Number.isInteger(baseVersion)).toBe(true);
    expect(baseVersion).toBeGreaterThan(0);
  }
}

describe('Property 10: Version-gated mutation safety and pipeline rollback', () => {
  // **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 6.16, 6.17, 6.20, 6.21, 7.3, 7.4**
  it('permits only matching identifier/version updates and deletes, with no ungated write', async () => {
    await fc.assert(
      fc.asyncProperty(mutationCaseArb, async (generated) => {
        const target = row({
          id: generated.id,
          version: generated.version,
          fullName: generated.originalName,
        });
        const bystander = row({
          id: generated.otherId,
          version: generated.version + 1,
          fullName: 'Bystander',
        });

        const invalidStore = createVersionedOperations([target, bystander]);
        const invalidRepository = repositoryFor(invalidStore.operations);
        const invalidBefore = invalidStore.snapshot();
        const invalidResults = await Promise.all([
          invalidRepository.save(
            generated.invalidIdentifier,
            { fullName: generated.updatedName },
            generated.version,
          ),
          invalidRepository.save(
            generated.id,
            { fullName: generated.updatedName },
            generated.invalidVersion,
          ),
          invalidRepository.remove(generated.invalidIdentifier, generated.version),
          invalidRepository.remove(generated.id, generated.invalidVersion),
        ]);

        expect(invalidResults.every((result) => result.status === 'error')).toBe(true);
        expect(
          invalidResults.every((result) => result.error?.code === DataErrorCode.VALIDATION),
        ).toBe(true);
        expect(invalidStore.operations.update).not.toHaveBeenCalled();
        expect(invalidStore.operations.remove).not.toHaveBeenCalled();
        expect(invalidStore.snapshot()).toEqual(invalidBefore);

        const absentStore = createVersionedOperations([target, bystander]);
        const absentResult = await repositoryFor(absentStore.operations).save(
          generated.absentId,
          { fullName: generated.updatedName },
          generated.version,
        );
        expect(absentResult).toEqual({ status: 'notFound' });
        expect(absentStore.snapshot()).toEqual(invalidBefore);

        const updateStore = createVersionedOperations([target, bystander]);
        const updateRepository = repositoryFor(updateStore.operations);
        const staleResult = await updateRepository.save(
          generated.id,
          { fullName: generated.updatedName },
          generated.version + generated.staleOffset,
        );
        expect(staleResult).toEqual({ status: 'conflict', current: target });
        expect(updateStore.snapshot()).toEqual(invalidBefore);

        const savedResult = await updateRepository.save(
          generated.id,
          { fullName: generated.updatedName },
          generated.version,
        );
        expect(savedResult).toMatchObject({
          status: 'saved',
          nurse: {
            id: generated.id,
            fullName: generated.updatedName,
            version: generated.version + 1,
          },
        });
        expect(updateStore.snapshot()).toEqual(
          [
            { ...target, fullName: generated.updatedName, version: generated.version + 1 },
            bystander,
          ].sort((left, right) => left.id.localeCompare(right.id)),
        );

        const deleteStore = createVersionedOperations([target, bystander]);
        const deleteRepository = repositoryFor(deleteStore.operations);
        const staleDelete = await deleteRepository.remove(
          generated.id,
          generated.version + generated.staleOffset,
        );
        expect(staleDelete).toEqual({ status: 'conflict', current: target });
        expect(deleteStore.snapshot()).toEqual(invalidBefore);

        const deleted = await deleteRepository.remove(generated.id, generated.version);
        expect(deleted).toEqual({ status: 'deleted' });
        expect(deleteStore.snapshot()).toEqual([bystander]);

        expectEveryWriteGated(absentStore.operations);
        expectEveryWriteGated(updateStore.operations);
        expectEveryWriteGated(deleteStore.operations);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('coalesces duplicate pending save, pipeline, and delete activations', async () => {
    await fc.assert(
      fc.asyncProperty(duplicateActivationArb, async (generated) => {
        const target = row({ id: generated.id, version: generated.version });
        const gate = deferred();
        const store = createVersionedOperations([target], { gate });
        const model = createMutationSafetyModel(repositoryFor(store.operations), [target]);
        const pipelineChanges = {
          pipelineStage: generated.pipelineStage,
          readinessStatus: calculateReadinessStatus(generated.pipelineStage),
        };

        let first;
        let duplicate;
        if (generated.activation === 'save') {
          first = model.save(
            generated.id,
            { preferredName: generated.updatedName },
            generated.version,
          );
          duplicate = model.save(
            generated.id,
            { preferredName: generated.updatedName },
            generated.version,
          );
        } else if (generated.activation === 'pipeline') {
          first = model.changePipeline(generated.id, pipelineChanges, generated.version);
          duplicate = model.changePipeline(generated.id, pipelineChanges, generated.version);
        } else {
          first = model.remove(generated.id, generated.version);
          duplicate = model.remove(generated.id, generated.version);
        }

        expect(duplicate).toBe(first);
        gate.resolve();
        const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
        expect(duplicateResult).toEqual(firstResult);

        if (generated.activation === 'delete') {
          expect(store.operations.remove).toHaveBeenCalledTimes(1);
          expect(store.operations.update).not.toHaveBeenCalled();
        } else {
          expect(store.operations.update).toHaveBeenCalledTimes(1);
          expect(store.operations.remove).not.toHaveBeenCalled();
        }
        expectEveryWriteGated(store.operations);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('restores exact prior pipeline values after every failure or conflict and never auto-retries', async () => {
    await fc.assert(
      fc.asyncProperty(pipelineFailureArb, async (generated) => {
        const target = row({
          id: generated.id,
          version: generated.version,
          pipelineStage: generated.priorStage,
          readinessStatus: generated.priorReadiness,
        });
        const store = createVersionedOperations([target], {
          updateOutcome: generated.failure,
        });
        const model = createMutationSafetyModel(repositoryFor(store.operations), [target]);
        const nextValues = {
          pipelineStage: generated.nextStage,
          readinessStatus: calculateReadinessStatus(generated.nextStage),
        };

        const request = model.changePipeline(generated.id, nextValues, generated.version);
        expect(model.displayed(generated.id)).toMatchObject(nextValues);

        const result = await request;
        expect(model.displayed(generated.id)).toEqual(target);
        expect(store.snapshot()).toEqual([target]);
        expect(store.operations.update).toHaveBeenCalledTimes(1);
        expectEveryWriteGated(store.operations);

        if (generated.failure.kind === 'conflict') {
          expect(result).toEqual({ status: 'conflict', current: target });
          expect(model.pipelineDecision()).toEqual({
            retryAvailable: false,
            requiresReload: true,
          });
        } else {
          expect(result).toMatchObject({
            status: 'error',
            error: { code: generated.failure.code },
          });
          expect(model.pipelineDecision()).toEqual({
            retryAvailable: RECOVERABLE_CODES.has(generated.failure.code),
            requiresReload: false,
          });
        }

        await Promise.resolve();
        expect(store.operations.update).toHaveBeenCalledTimes(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
