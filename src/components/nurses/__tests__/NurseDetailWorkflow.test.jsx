import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';

import { DataError, DataErrorCode } from '../../../lib/dataLayer/errors';
import { createNurseController } from '../../../lib/nurses/nurseController';
import { createNurse } from '../../../test/factories/nurseFactory';
import NurseCard from '../NurseCard';

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function makeNurse(overrides = {}) {
  return createNurse({
    id: 'nurse-detail-1',
    ownerId: 'owner-1',
    fullName: 'Authoritative Nurse',
    email: 'authoritative@example.test',
    city: 'Johannesburg',
    version: 3,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
    ...overrides,
  });
}

function makeRepository(overrides = {}) {
  return {
    listAll: vi.fn(async () => ({ status: 'ok', nurses: [], total: 0 })),
    get: vi.fn(async () => ({ status: 'notFound' })),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

function initialState(items) {
  return {
    items,
    total: items.length,
    hasAcceptedList: true,
    listState: 'success',
  };
}

function DetailWorkflow({ controller, ids = [], onDeleteResolved = vi.fn() }) {
  const nurseSlice = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  );
  const detailVisible = nurseSlice.selectedId !== null || nurseSlice.detailState !== 'idle';

  return (
    <>
      {ids.map((id) => (
        <button key={id} type="button" onClick={() => controller.openNurse(id)}>
          Open {id}
        </button>
      ))}
      {detailVisible && (
        <NurseCard
          nurseSlice={nurseSlice}
          onUpdateDraft={controller.updateDraft}
          onSave={controller.saveNurse}
          onRetrySave={controller.retrySave}
          onRequestCancel={controller.requestCancelEdit}
          onResolveDiscard={controller.resolveDiscard}
          onRetryDetail={controller.retryDetail}
          onClose={controller.closeDetail}
          onApplyConflictToLatest={controller.applyConflictToLatest}
          onRequestDiscardConflict={controller.requestDiscardConflict}
          onKeepEditingAfterConflict={controller.keepEditingAfterConflict}
          permissions={{ canEdit: true, canDelete: true }}
          onRequestDelete={controller.requestDelete}
          onCancelDelete={controller.cancelDelete}
          onConfirmDelete={controller.confirmDelete}
          onRetryDelete={controller.retryDelete}
          onReloadAfterDeleteConflict={controller.reloadAfterDeleteConflict}
          onDeleteResolved={onDeleteResolved}
        />
      )}
    </>
  );
}

describe('NurseCard with the authoritative nurse controller', () => {
  it('keeps editing disabled, ignores a late response, and enables only the newest authoritative detail', async () => {
    const first = makeNurse({ id: 'nurse-first', fullName: 'First Snapshot' });
    const second = makeNurse({ id: 'nurse-second', fullName: 'Second Authoritative' });
    const firstRead = deferred();
    const secondRead = deferred();
    const repository = makeRepository({
      get: vi.fn((id) => (id === first.id ? firstRead.promise : secondRead.promise)),
    });
    const controller = createNurseController({
      repository,
      initialState: initialState([first, second]),
    });
    render(<DetailWorkflow controller={controller} ids={[first.id, second.id]} />);

    fireEvent.click(screen.getByRole('button', { name: `Open ${first.id}` }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading nurse details');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: `Open ${second.id}` }));
    await act(async () => {
      firstRead.resolve({ status: 'ok', nurse: first });
      await firstRead.promise;
    });

    expect(screen.getByRole('status')).toHaveTextContent('Loading nurse details');
    expect(screen.queryByText('First Snapshot')).not.toBeInTheDocument();

    await act(async () => {
      secondRead.resolve({ status: 'ok', nurse: second });
      await secondRead.promise;
    });

    expect(screen.getByRole('heading', { name: 'Second Authoritative' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue(second.email);
    expect(screen.getByLabelText('Email')).toBeEnabled();
    expect(controller.getState()).toMatchObject({
      selectedId: second.id,
      originalBase: second,
      baseVersion: second.version,
    });
  });

  it('keeps recoverable detail failure visible, retries the same identifier, and handles not found', async () => {
    const nurse = makeNurse();
    const networkError = new DataError(DataErrorCode.NETWORK, 'Authoritative read timed out.');
    const repository = makeRepository({
      get: vi
        .fn()
        .mockResolvedValueOnce({ status: 'error', error: networkError })
        .mockResolvedValueOnce({ status: 'ok', nurse })
        .mockResolvedValueOnce({ status: 'notFound' }),
    });
    const controller = createNurseController({
      repository,
      initialState: initialState([nurse]),
    });
    render(<DetailWorkflow controller={controller} ids={[nurse.id]} />);

    fireEvent.click(screen.getByRole('button', { name: `Open ${nurse.id}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authoritative read timed out');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: nurse.fullName })).toBeInTheDocument();
    expect(repository.get).toHaveBeenNthCalledWith(2, nurse.id, { retryCount: 1 });

    act(() => controller.closeDetail());
    fireEvent.click(screen.getByRole('button', { name: `Open ${nurse.id}` }));
    expect(
      await screen.findByRole('heading', { name: 'This nurse no longer exists' })
    ).toBeInTheDocument();
    expect(controller.getState().items).toEqual([]);
  });

  it('keeps edits local, rebases a visible conflict, and advances the version only after a second explicit save', async () => {
    const original = makeNurse({ city: 'Johannesburg', version: 3 });
    const latest = makeNurse({
      city: 'Johannesburg',
      province: 'Western Cape',
      version: 4,
      updatedAt: '2026-06-03T10:00:00Z',
    });
    const committed = {
      ...latest,
      email: 'local-edit@example.test',
      version: 5,
      updatedAt: '2026-06-04T10:00:00Z',
    };
    const repository = makeRepository({
      get: vi.fn(async () => ({ status: 'ok', nurse: original })),
      save: vi
        .fn()
        .mockResolvedValueOnce({ status: 'conflict', current: latest })
        .mockResolvedValueOnce({ status: 'saved', nurse: committed }),
    });
    const controller = createNurseController({
      repository,
      initialState: initialState([original]),
    });
    render(<DetailWorkflow controller={controller} ids={[original.id]} />);

    fireEvent.click(screen.getByRole('button', { name: `Open ${original.id}` }));
    const email = await screen.findByLabelText('Email');
    fireEvent.change(email, { target: { value: 'local-edit@example.test' } });

    expect(repository.save).not.toHaveBeenCalled();
    expect(controller.getState().selected.email).toBe(original.email);
    expect(controller.getState().draft.email).toBe('local-edit@example.test');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('This nurse changed after you opened it')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(repository.save).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Review differences' }));
    expect(screen.getByText('local-edit@example.test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply my edits to latest' }));

    expect(screen.queryByText('This nurse changed after you opened it')).not.toBeInTheDocument();
    expect(screen.getByText('Base version 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('local-edit@example.test');
    expect(repository.save).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2));
    expect(repository.save.mock.calls[1][2]).toBe(4);
    expect(await screen.findByText('Base version 5 · Saved')).toBeInTheDocument();
    expect(controller.getState()).toMatchObject({
      items: [committed],
      selected: committed,
      originalBase: committed,
      draft: committed,
      baseVersion: 5,
    });
  });

  it('requires authoritative reload and fresh confirmation after a stale delete', async () => {
    const original = makeNurse({ fullName: 'Original Name', version: 3 });
    const latest = makeNurse({
      fullName: 'Latest Name',
      version: 4,
      updatedAt: '2026-06-03T10:00:00Z',
    });
    const repository = makeRepository({
      get: vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', nurse: original })
        .mockResolvedValueOnce({ status: 'ok', nurse: latest }),
      remove: vi
        .fn()
        .mockResolvedValueOnce({ status: 'conflict', current: latest })
        .mockResolvedValueOnce({ status: 'deleted' }),
    });
    const onDeleteResolved = vi.fn();
    const controller = createNurseController({
      repository,
      initialState: initialState([original]),
    });
    render(
      <DetailWorkflow
        controller={controller}
        ids={[original.id]}
        onDeleteResolved={onDeleteResolved}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: `Open ${original.id}` }));
    await screen.findByRole('heading', { name: 'Original Name' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete nurse' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Original Name?' })).getByRole(
        'button',
        { name: 'Delete nurse' }
      )
    );

    expect(
      await screen.findByRole('alertdialog', { name: 'Reload Latest Name before deleting' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry delete' })).not.toBeInTheDocument();
    expect(repository.remove).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reload Details' }));
    expect(await screen.findByRole('heading', { name: 'Latest Name' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Base version 4')).toBeInTheDocument();
    expect(repository.remove).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete nurse' }));
    expect(screen.getByRole('alertdialog', { name: 'Delete Latest Name?' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Latest Name?' })).getByRole('button', {
        name: 'Delete nurse',
      })
    );

    await waitFor(() => expect(repository.remove).toHaveBeenCalledTimes(2));
    expect(repository.remove.mock.calls[1][1]).toBe(4);
    expect(onDeleteResolved).toHaveBeenCalledWith({ status: 'deleted' });
    expect(controller.getState().items).toEqual([]);
  });
});
