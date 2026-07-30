import { describe, expect, it, vi } from 'vitest';

import { createNurseController } from '../nurseController';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('nurseController principal isolation', () => {
  it('clears confirmed rows and ignores a prior-principal list response', async () => {
    const first = deferred();
    const repository = {
      listAll: vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockResolvedValueOnce({
          status: 'ok',
          nurses: [{ id: 'new-principal-row', version: 1 }],
          total: 1,
        }),
    };
    const controller = createNurseController({
      repository,
      initialState: {
        items: [{ id: 'old-confirmed-row', version: 1 }],
        total: 1,
        hasAcceptedList: true,
        listState: 'success',
      },
    });

    const oldRequest = controller.refreshNurses();
    controller.clearForPrincipalChange();
    expect(controller.getState().items).toEqual([]);

    await controller.refreshNurses();
    expect(controller.getState().items).toEqual([{ id: 'new-principal-row', version: 1 }]);

    first.resolve({
      status: 'ok',
      nurses: [{ id: 'late-old-principal-row', version: 1 }],
      total: 1,
    });
    await oldRequest;

    expect(controller.getState().items).toEqual([{ id: 'new-principal-row', version: 1 }]);
    expect(repository.listAll).toHaveBeenCalledTimes(2);
  });

  it('detaches same-user old-epoch detail work as well as list dedupe handles', async () => {
    const first = deferred();
    const repository = {
      get: vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockResolvedValueOnce({
          status: 'ok',
          nurse: { id: 'nurse-1', fullName: 'Epoch 2', version: 2 },
        }),
    };
    const controller = createNurseController({ repository });
    controller.transitionAuthBoundary({ userId: 'user-1', authEpoch: 1 });

    const oldEpochRequest = controller.openNurse('nurse-1');
    controller.transitionAuthBoundary({ userId: 'user-1', authEpoch: 2 });
    await controller.openNurse('nurse-1');

    first.resolve({
      status: 'ok',
      nurse: { id: 'nurse-1', fullName: 'Late epoch 1', version: 1 },
    });
    await oldEpochRequest;

    expect(controller.getState()).toMatchObject({
      selected: { id: 'nurse-1', fullName: 'Epoch 2', version: 2 },
      draft: { id: 'nurse-1', fullName: 'Epoch 2', version: 2 },
      detailState: 'success',
    });
    expect(repository.get).toHaveBeenCalledTimes(2);
  });

  it('detaches same-user old-epoch work while preserving confirmed state and drafts', async () => {
    const first = deferred();
    const repository = {
      listAll: vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockResolvedValueOnce({
          status: 'ok',
          nurses: [{ id: 'epoch-2-row', version: 2 }],
          total: 1,
        }),
    };
    const controller = createNurseController({
      repository,
      initialState: {
        items: [{ id: 'confirmed-row', version: 1 }],
        total: 1,
        hasAcceptedList: true,
        listState: 'success',
        createDraft: { id: 'draft-1', fullName: 'Safe draft' },
      },
    });
    controller.transitionAuthBoundary({ userId: 'user-1', authEpoch: 1 });

    const oldEpochRequest = controller.refreshNurses();
    controller.transitionAuthBoundary({ userId: 'user-1', authEpoch: 2 });
    expect(controller.getState()).toMatchObject({
      items: [{ id: 'confirmed-row', version: 1 }],
      createDraft: { id: 'draft-1', fullName: 'Safe draft' },
    });

    await controller.refreshNurses();
    expect(controller.getState().items).toEqual([{ id: 'epoch-2-row', version: 2 }]);

    first.resolve({
      status: 'ok',
      nurses: [{ id: 'late-epoch-1-row', version: 1 }],
      total: 1,
    });
    await oldEpochRequest;

    expect(controller.getState().items).toEqual([{ id: 'epoch-2-row', version: 2 }]);
    expect(repository.listAll).toHaveBeenCalledTimes(2);
  });
});
