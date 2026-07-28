import { describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseController, NurseAsyncState } from '../nurseController';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function draft(overrides = {}) {
  return {
    ...createBlankNurseDraft({
      now: new Date('2026-03-10T12:00:00.000Z'),
      randomUUID: () => UUID_A,
    }),
    fullName: 'Ada Nurse',
    ...overrides,
  };
}

function nurse(overrides = {}) {
  const normalized = normalizeNurseCreateDraft(draft());
  if (!normalized.valid) throw new Error('Test nurse must be valid.');
  return {
    ...normalized.value,
    ownerId: 'owner-1',
    version: 1,
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
    ...overrides,
  };
}

function repository(overrides = {}) {
  return {
    listAll: vi.fn(async () => ({ status: 'ok', nurses: [], total: 0 })),
    get: vi.fn(async () => ({ status: 'notFound' })),
    create: vi.fn(async (input) => ({
      status: 'saved',
      nurse: nurse({ ...input, version: 1 }),
    })),
    save: vi.fn(async (id, input, baseVersion) => ({
      status: 'saved',
      nurse: nurse({ ...input, id, version: baseVersion + 1 }),
    })),
    remove: vi.fn(async () => ({ status: 'deleted' })),
    ...overrides,
  };
}

async function loadListAndDetail(controller, committed) {
  await controller.refreshNurses();
  await controller.openNurse(committed.id);
}

describe('nurseController accepted list lifecycle', () => {
  it('coalesces refreshes and preserves accepted data through pending/failure until manual retry', async () => {
    const first = nurse();
    const gate = deferred();
    const networkError = new DataError(DataErrorCode.NETWORK);
    const repo = repository({
      listAll: vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', nurses: [first], total: 1 })
        .mockImplementationOnce(() => gate.promise)
        .mockResolvedValueOnce({ status: 'ok', nurses: [], total: 0 }),
    });
    const controller = createNurseController({ repository: repo });

    await controller.refreshNurses();
    const pending = controller.refreshNurses();
    const duplicate = controller.refreshNurses();

    expect(duplicate).toBe(pending);
    expect(repo.listAll).toHaveBeenCalledTimes(2);
    expect(controller.getState()).toMatchObject({
      items: [first],
      total: 1,
      listState: NurseAsyncState.LOADING,
      staleWarning: false,
    });

    gate.resolve({ status: 'error', error: networkError });
    await pending;
    expect(controller.getState()).toMatchObject({
      items: [first],
      total: 1,
      listState: NurseAsyncState.ERROR,
      listError: networkError,
      staleWarning: true,
    });
    expect(repo.listAll).toHaveBeenCalledTimes(2);

    await controller.retryNurses();
    expect(controller.getState()).toMatchObject({
      items: [],
      total: 0,
      hasAcceptedList: true,
      listState: NurseAsyncState.SUCCESS,
      listError: null,
      staleWarning: false,
    });
    expect(repo.listAll).toHaveBeenLastCalledWith({ retryCount: 1 });
  });

  it('accepts a persisted legacy compatibility collection without repository fallback', () => {
    const repo = repository();
    const controller = createNurseController({ repository: repo });
    const persisted = [nurse({ id: 'legacy-nurse' })];

    controller.acceptLegacyCollection(persisted);

    expect(controller.getState()).toMatchObject({
      items: persisted,
      total: 1,
      hasAcceptedList: true,
      listState: NurseAsyncState.SUCCESS,
      listError: null,
      staleWarning: false,
    });
    expect(repo.listAll).not.toHaveBeenCalled();
  });

  it('does not offer retry for authorization failures', async () => {
    const forbidden = new DataError(DataErrorCode.FORBIDDEN);
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'error', error: forbidden })),
    });
    const controller = createNurseController({ repository: repo });

    await controller.refreshNurses();
    await controller.retryNurses();

    expect(repo.listAll).toHaveBeenCalledTimes(1);
    expect(controller.getState().listError).toBe(forbidden);
  });
});

describe('nurseController authoritative detail and edit drafts', () => {
  it('ignores late responses and changes only the draft until explicit save', async () => {
    const first = nurse({ id: 'nurse-first', fullName: 'First Nurse' });
    const second = nurse({ id: 'nurse-second', fullName: 'Second Nurse' });
    const firstGate = deferred();
    const secondGate = deferred();
    const repo = repository({
      get: vi.fn((id) => (id === first.id ? firstGate.promise : secondGate.promise)),
    });
    const controller = createNurseController({ repository: repo });

    const firstRequest = controller.openNurse(first.id);
    const secondRequest = controller.openNurse(second.id);
    firstGate.resolve({ status: 'ok', nurse: first });
    await firstRequest;
    expect(controller.getState()).toMatchObject({
      selectedId: second.id,
      selected: null,
      detailState: NurseAsyncState.LOADING,
    });

    secondGate.resolve({ status: 'ok', nurse: second });
    await secondRequest;
    controller.updateDraft({ fullName: 'Locally Edited' });

    expect(controller.getState().selected.fullName).toBe('Second Nurse');
    expect(controller.getState().originalBase.fullName).toBe('Second Nurse');
    expect(controller.getState().draft.fullName).toBe('Locally Edited');
    expect(repo.save).not.toHaveBeenCalled();
    expect(controller.requestCancelEdit()).toEqual({ status: 'confirmationRequired' });
    expect(controller.getState().discardDecision).toEqual({ type: 'discardEdit' });
    expect(controller.resolveDiscard(false)).toEqual({ status: 'kept' });
    expect(controller.getState().draft.fullName).toBe('Locally Edited');
  });

  it('closes a clean edit without confirmation or a write', async () => {
    const committed = nurse();
    const repo = repository({
      get: vi.fn(async () => ({ status: 'ok', nurse: committed })),
    });
    const controller = createNurseController({ repository: repo });

    await controller.openNurse(committed.id);

    expect(controller.requestCancelEdit()).toEqual({ status: 'closed' });
    expect(controller.getState().selectedId).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('nurseController create lifecycle', () => {
  it('preserves a stable create draft across duplicate pending activation and recoverable retry', async () => {
    const gate = deferred();
    const networkError = new DataError(DataErrorCode.NETWORK);
    const committed = nurse({ fullName: 'Created Nurse' });
    const repo = repository({
      create: vi
        .fn()
        .mockImplementationOnce(() => gate.promise)
        .mockResolvedValueOnce({ status: 'saved', nurse: committed }),
    });
    const controller = createNurseController({
      repository: repo,
      makeCreateDraft: () => draft({ fullName: '' }),
    });
    const opened = controller.openCreate();
    controller.updateCreateDraft({ fullName: 'Created Nurse' });

    const pending = controller.createNurse();
    const duplicate = controller.createNurse();
    expect(duplicate).toBe(pending);
    expect(controller.getState().createDraft).toMatchObject({
      id: opened.id,
      fullName: 'Created Nurse',
    });

    gate.resolve({ status: 'error', error: networkError });
    await pending;
    expect(controller.getState()).toMatchObject({
      items: [],
      createDraft: { id: opened.id, fullName: 'Created Nurse' },
      createDecision: { type: 'createFailure', retryAvailable: true },
    });
    expect(repo.create).toHaveBeenCalledTimes(1);

    await controller.retryCreate();
    expect(repo.create.mock.calls[1][0].id).toBe(opened.id);
    expect(repo.create.mock.calls[1][1]).toEqual({ retry: true, retryCount: 1 });
    expect(controller.getState()).toMatchObject({
      items: [committed],
      total: 1,
      createDraft: null,
      createState: NurseAsyncState.SUCCESS,
      notice: { type: 'created', message: 'Nurse created.' },
    });
  });

  it('assigns exactly one fresh ID before an explicit collision retry', async () => {
    const conflict = new DataError(DataErrorCode.CONFLICT);
    const committed = nurse({ id: `nurse-${UUID_B}` });
    const repo = repository({
      create: vi
        .fn()
        .mockResolvedValueOnce({ status: 'collision', current: committed, error: conflict })
        .mockResolvedValueOnce({ status: 'saved', nurse: committed }),
    });
    const makeDraftId = vi.fn(() => `nurse-${UUID_B}`);
    const controller = createNurseController({ repository: repo, makeDraftId });
    controller.openCreate({ randomUUID: () => UUID_A });
    controller.updateCreateDraft({ fullName: 'Created Nurse' });

    await controller.createNurse();
    expect(controller.getState().createDecision.type).toBe('createCollision');
    expect(makeDraftId).not.toHaveBeenCalled();

    await controller.retryCreateAfterCollision();
    expect(makeDraftId).toHaveBeenCalledTimes(1);
    expect(repo.create.mock.calls[1][0].id).toBe(`nurse-${UUID_B}`);
  });
});

describe('nurseController save and conflict choices', () => {
  it('preserves committed state on conflict, rebases local fields, and advances only after another save', async () => {
    const original = nurse({ fullName: 'Original', preferredName: 'Old', version: 3 });
    const latest = nurse({ fullName: 'Server Name', preferredName: 'Old', version: 4 });
    const committed = nurse({ fullName: 'Local Name', preferredName: 'Old', version: 5 });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: original })),
      save: vi
        .fn()
        .mockResolvedValueOnce({ status: 'conflict', current: latest })
        .mockResolvedValueOnce({ status: 'saved', nurse: committed }),
    });
    const controller = createNurseController({ repository: repo });
    await loadListAndDetail(controller, original);
    controller.updateDraft({ fullName: 'Local Name' });

    await controller.saveNurse();
    expect(controller.getState()).toMatchObject({
      items: [original],
      selected: original,
      draft: { fullName: 'Local Name' },
      saveDecision: { type: 'saveConflict', latest },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);

    expect(controller.applyConflictToLatest()).toBe(true);
    expect(controller.getState()).toMatchObject({
      items: [original],
      originalBase: latest,
      draft: { fullName: 'Local Name', preferredName: 'Old', version: 4 },
      baseVersion: 4,
      saveState: NurseAsyncState.IDLE,
    });
    expect(repo.save).toHaveBeenCalledTimes(1);

    await controller.saveNurse();
    expect(repo.save.mock.calls[1][2]).toBe(4);
    expect(controller.getState()).toMatchObject({
      items: [committed],
      selected: committed,
      originalBase: committed,
      draft: committed,
      baseVersion: 5,
      saveState: NurseAsyncState.SUCCESS,
    });
  });

  it('requires confirmation before discarding conflict edits and adopts latest without a write', async () => {
    const original = nurse({ fullName: 'Original', version: 2 });
    const latest = nurse({ fullName: 'Latest', version: 3 });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: original })),
      save: vi.fn(async () => ({ status: 'conflict', current: latest })),
    });
    const controller = createNurseController({ repository: repo });
    await loadListAndDetail(controller, original);
    controller.updateDraft({ fullName: 'Local' });
    await controller.saveNurse();

    expect(controller.requestDiscardConflict()).toBe(true);
    expect(controller.getState().draft.fullName).toBe('Local');
    controller.resolveDiscard(true);

    expect(controller.getState()).toMatchObject({
      items: [latest],
      selected: latest,
      originalBase: latest,
      draft: latest,
      baseVersion: 3,
      saveDecision: null,
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('removes a not-found target while preserving the unsaved draft for recovery', async () => {
    const original = nurse({ version: 2 });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: original })),
      save: vi.fn(async () => ({ status: 'notFound' })),
    });
    const controller = createNurseController({ repository: repo });
    await loadListAndDetail(controller, original);
    controller.updateDraft({ fullName: 'Unsaved Name' });

    await controller.saveNurse();

    expect(controller.getState()).toMatchObject({
      items: [],
      total: 0,
      detailState: NurseAsyncState.NOT_FOUND,
      orphanedDraft: { fullName: 'Unsaved Name' },
      notice: { type: 'notFound', message: 'This nurse no longer exists.' },
    });
  });
});

describe('nurseController pipeline and delete convergence', () => {
  it('deduplicates pipeline writes and leaves committed values unchanged on failure', async () => {
    const original = nurse({ pipelineStage: 'Applied', readinessStatus: 'Not Ready', version: 2 });
    const gate = deferred();
    const networkError = new DataError(DataErrorCode.NETWORK);
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      save: vi.fn(() => gate.promise),
    });
    const controller = createNurseController({ repository: repo });
    await controller.refreshNurses();

    const pending = controller.changeNursePipeline(original.id, 'Screening', 2);
    const duplicate = controller.changeNursePipeline(original.id, 'Screening', 2);

    expect(duplicate).toBe(pending);
    expect(controller.getState().items).toEqual([original]);
    expect(controller.getState().pipeline[original.id]).toMatchObject({
      state: NurseAsyncState.LOADING,
      previous: { pipelineStage: 'Applied', readinessStatus: 'Not Ready' },
      proposed: { pipelineStage: 'Screening' },
    });

    gate.resolve({ status: 'error', error: networkError });
    await pending;
    expect(controller.getState().items).toEqual([original]);
    expect(controller.getState().pipeline[original.id]).toMatchObject({
      state: NurseAsyncState.ERROR,
      decision: { type: 'pipelineFailure', retryAvailable: true },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('blocks new moves after conflict until explicit rebase, then requires a fresh move', async () => {
    const original = nurse({
      pipelineStage: 'Applied',
      readinessStatus: 'Not Ready',
      version: 2,
    });
    const latest = nurse({
      pipelineStage: 'Under Review',
      readinessStatus: 'Not Ready',
      version: 3,
    });
    const committed = nurse({
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
      version: 4,
    });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      save: vi
        .fn()
        .mockResolvedValueOnce({ status: 'conflict', current: latest })
        .mockResolvedValueOnce({ status: 'saved', nurse: committed }),
    });
    const controller = createNurseController({ repository: repo });
    await controller.refreshNurses();

    await controller.changeNursePipeline({
      id: original.id,
      baseVersion: original.version,
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
    });

    expect(repo.save).toHaveBeenCalledWith(
      original.id,
      { pipelineStage: 'OET Passed', readinessStatus: 'Placement Ready' },
      2,
      { retryCount: 0 }
    );
    expect(controller.getState()).toMatchObject({
      items: [original],
      pipeline: {
        [original.id]: {
          decision: { type: 'pipelineConflict', latest, requiresReload: true },
          previous: { pipelineStage: 'Applied', readinessStatus: 'Not Ready' },
        },
      },
    });

    const blocked = await controller.changeNursePipeline({
      id: original.id,
      baseVersion: original.version,
      pipelineStage: 'Placed',
      readinessStatus: 'Placed',
    });
    expect(blocked.status).toBe('blocked');
    expect(repo.save).toHaveBeenCalledTimes(1);

    expect(controller.rebasePipeline(original.id)).toBe(true);
    expect(controller.getState()).toMatchObject({
      items: [latest],
      pipeline: {
        [original.id]: { state: NurseAsyncState.SUCCESS, decision: null, baseVersion: 3 },
      },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);

    await controller.changeNursePipeline({
      id: original.id,
      baseVersion: latest.version,
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
    });
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(controller.getState().items).toEqual([committed]);
  });

  it('reloads authoritative state after a failed move without retrying the write', async () => {
    const original = nurse({
      pipelineStage: 'Applied',
      readinessStatus: 'Not Ready',
      version: 2,
    });
    const latest = nurse({
      pipelineStage: 'CV Submitted',
      readinessStatus: 'Not Ready',
      version: 3,
    });
    const networkError = new DataError(DataErrorCode.NETWORK);
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: latest })),
      save: vi.fn(async () => ({ status: 'error', error: networkError })),
    });
    const controller = createNurseController({ repository: repo });
    await controller.refreshNurses();

    await controller.changeNursePipeline({
      id: original.id,
      baseVersion: 2,
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
    });
    expect(controller.getState().items).toEqual([original]);

    await controller.reloadPipeline(original.id);

    expect(repo.get).toHaveBeenCalledWith(original.id, { retryCount: 1 });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({
      items: [latest],
      pipeline: {
        [original.id]: {
          state: NurseAsyncState.SUCCESS,
          decision: null,
          baseVersion: latest.version,
          resolution: 'reload',
        },
      },
    });
  });

  it('requires reload and a fresh confirmation after delete conflict', async () => {
    const original = nurse({ version: 2 });
    const latest = nurse({ version: 3, fullName: 'Latest Name' });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: latest })),
      remove: vi.fn(async () => ({ status: 'conflict', current: latest })),
    });
    const controller = createNurseController({ repository: repo });
    await controller.refreshNurses();
    await controller.openNurse(original.id);
    controller.requestDelete();

    await controller.confirmDelete();
    expect(controller.getState()).toMatchObject({
      items: [original],
      selected: latest,
      deleteDecision: { type: 'deleteConflict', retryAvailable: false, requiresReload: true },
    });
    await controller.retryDelete();
    expect(repo.remove).toHaveBeenCalledTimes(1);

    await controller.reloadAfterDeleteConflict();
    expect(controller.getState()).toMatchObject({
      selected: latest,
      baseVersion: 3,
      deleteDecision: null,
    });
    expect(repo.remove).toHaveBeenCalledTimes(1);

    expect(controller.requestDelete()).toBe(true);
    expect(controller.getState().deleteDecision).toMatchObject({
      type: 'confirmDelete',
      baseVersion: 3,
    });
  });

  it.each([
    ['deleted', 'Nurse deleted.'],
    ['alreadyDeleted', 'This nurse was already deleted.'],
  ])('converges %s to absence only after the repository confirms it', async (status, message) => {
    const original = nurse({ version: 2 });
    const gate = deferred();
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi.fn(async () => ({ status: 'ok', nurse: original })),
      remove: vi.fn(() => gate.promise),
    });
    const controller = createNurseController({ repository: repo });
    await loadListAndDetail(controller, original);
    controller.requestDelete();
    const pending = controller.confirmDelete();

    expect(controller.getState()).toMatchObject({
      items: [original],
      selected: original,
      deleteState: NurseAsyncState.LOADING,
    });
    const duplicate = controller.confirmDelete();
    expect(duplicate).toBe(pending);

    gate.resolve({ status });
    await pending;
    expect(controller.getState()).toMatchObject({
      items: [],
      total: 0,
      selectedId: null,
      deleteState: NurseAsyncState.SUCCESS,
      notice: { message },
    });
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });

  it('resolves a conflict reload not-found as already deleted without a second delete', async () => {
    const original = nurse({ version: 2 });
    const repo = repository({
      listAll: vi.fn(async () => ({ status: 'ok', nurses: [original], total: 1 })),
      get: vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', nurse: original })
        .mockResolvedValueOnce({ status: 'notFound' }),
      remove: vi.fn(async () => ({ status: 'conflict', current: nurse({ version: 3 }) })),
    });
    const controller = createNurseController({ repository: repo });
    await loadListAndDetail(controller, original);
    controller.requestDelete();
    await controller.confirmDelete();

    await controller.reloadAfterDeleteConflict();

    expect(controller.getState()).toMatchObject({
      items: [],
      total: 0,
      selectedId: null,
      notice: { type: 'alreadyDeleted', message: 'This nurse was already deleted.' },
    });
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });
});
