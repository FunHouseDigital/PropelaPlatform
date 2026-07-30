import fc from 'fast-check';

import { createNurse } from '../../../test/factories/nurseFactory';
import { fireEvent, render, screen, waitFor, within } from '../../../test/utils';
import NurseCard from '../NurseCard';

function makeNurse(overrides = {}) {
  return createNurse({
    id: 'nurse-detail-1',
    ownerId: 'owner-1',
    version: 3,
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-02T10:00:00Z',
    fullName: 'Thandi Nkosi',
    preferredName: 'Thandi',
    pipelineStage: 'Applied',
    nextAction: 'Needs: Chase CV, then scoring',
    nextActionDueDate: '2099-12-31',
    email: 'thandi@example.com',
    communicationLog: [
      {
        date: '2025-06-10',
        channel: 'Email',
        summary: 'Initial outreach',
        nextAction: 'Follow up',
      },
    ],
    ...overrides,
  });
}

function makeSlice(overrides = {}) {
  const nurse = makeNurse();
  return {
    selectedId: nurse.id,
    selected: nurse,
    detailState: 'success',
    detailError: null,
    originalBase: nurse,
    draft: nurse,
    baseVersion: nurse.version,
    saveState: 'idle',
    saveError: null,
    saveValidation: null,
    saveDecision: null,
    discardDecision: null,
    ...overrides,
  };
}

function makeProps(overrides = {}) {
  return {
    nurseSlice: makeSlice(),
    onUpdateDraft: vi.fn(),
    onSave: vi.fn(),
    onRetrySave: vi.fn(),
    onRequestCancel: vi.fn(() => ({ status: 'closed' })),
    onResolveDiscard: vi.fn(),
    onRetryDetail: vi.fn(),
    onClose: vi.fn(),
    onApplyConflictToLatest: vi.fn(),
    onRequestDiscardConflict: vi.fn(),
    onKeepEditingAfterConflict: vi.fn(),
    canDelete: true,
    onRequestDelete: vi.fn(),
    onCancelDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
    onRetryDelete: vi.fn(),
    onReloadAfterDeleteConflict: vi.fn(),
    onDeleteResolved: vi.fn(),
    ...overrides,
  };
}

describe('NurseCard explicit detail edit session', () => {
  it('shows authoritative loading without editable or persistence controls', () => {
    const props = makeProps({
      nurseSlice: makeSlice({ detailState: 'loading', draft: null, originalBase: null }),
    });
    const { container } = render(<NurseCard {...props} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading nurse details');
    expect(document.body.contains(status)).toBe(true);
    expect(container.contains(status)).toBe(false);
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  });

  it('renders the authoritative draft and read-only metadata', () => {
    render(<NurseCard {...makeProps()} />);

    expect(screen.getByRole('heading', { name: 'Thandi Nkosi' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record Metadata' }));
    expect(screen.getByText('nurse-detail-1')).toBeInTheDocument();
    expect(screen.getByText('owner-1')).toBeInTheDocument();
    expect(screen.getByText('2025-01-01T10:00:00Z')).toBeInTheDocument();
    expect(screen.queryByLabelText('Version')).not.toBeInTheDocument();
  });

  it('updates only the local controller draft and never saves while typing', () => {
    const props = makeProps();
    render(<NurseCard {...props} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'local@example.com' } });

    expect(props.onUpdateDraft).toHaveBeenCalledWith({ email: 'local@example.com' });
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('requires explicit Save for a dirty draft', () => {
    const original = makeNurse();
    const draft = { ...original, email: 'changed@example.com' };
    const props = makeProps({ nurseSlice: makeSlice({ originalBase: original, draft }) });
    render(<NurseCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  it('disables duplicate saves and editable controls while persistence is pending', () => {
    const original = makeNurse();
    const draft = { ...original, email: 'changed@example.com' };
    render(
      <NurseCard
        {...makeProps({
          nurseSlice: makeSlice({ originalBase: original, draft, saveState: 'loading' }),
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('requests clean cancellation and closes when the controller accepts it', () => {
    const props = makeProps();
    render(<NurseCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onRequestCancel).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a dirty draft open until discard is explicitly confirmed', () => {
    const original = makeNurse();
    const draft = { ...original, city: 'Cape Town' };
    const requestCancel = vi.fn(() => ({ status: 'confirmationRequired' }));
    const props = makeProps({
      nurseSlice: makeSlice({ originalBase: original, draft }),
      onRequestCancel: requestCancel,
    });
    const { rerender } = render(<NurseCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).not.toHaveBeenCalled();

    const confirmingProps = {
      ...props,
      nurseSlice: { ...props.nurseSlice, discardDecision: { type: 'discardEdit' } },
      onResolveDiscard: vi.fn(() => ({ status: 'discarded' })),
    };
    rerender(<NurseCard {...confirmingProps} />);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard changes to Thandi Nkosi');
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirmingProps.onResolveDiscard).toHaveBeenCalledWith(false);
    expect(confirmingProps.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard and close' }));
    expect(confirmingProps.onResolveDiscard).toHaveBeenCalledWith(true);
    expect(confirmingProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows categorized save failure and manual retry only for recoverable errors', () => {
    const original = makeNurse();
    const draft = { ...original, city: 'Cape Town' };
    const props = makeProps({
      nurseSlice: makeSlice({
        originalBase: original,
        draft,
        saveState: 'error',
        saveError: { code: 'NETWORK', message: 'Connection timed out.' },
        saveDecision: { type: 'saveFailure', retryAvailable: true },
      }),
    });
    render(<NurseCard {...props} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(props.onRetrySave).toHaveBeenCalledTimes(1);
  });

  it('keeps conflict decisions visible and supports review, rebase, discard, and keep editing', () => {
    const original = makeNurse({ city: 'Johannesburg', version: 3 });
    const draft = { ...original, city: 'Cape Town' };
    const latest = { ...original, province: 'Western Cape', version: 4 };
    const props = makeProps({
      nurseSlice: makeSlice({
        originalBase: original,
        draft,
        baseVersion: 3,
        saveState: 'error',
        saveDecision: { type: 'saveConflict', latest },
      }),
    });
    render(<NurseCard {...props} />);

    const conflictAlert = screen.getByRole('alert');
    const personalSection = screen.getByRole('button', { name: 'Personal Information' });
    expect(conflictAlert).toHaveTextContent('This nurse changed after you opened it');
    expect(conflictAlert.closest('[data-nurse-card-scroll-region="true"]')).toBe(
      personalSection.closest('[data-nurse-card-scroll-region="true"]')
    );
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Review differences' }));
    expect(screen.getByRole('columnheader', { name: 'Latest saved' })).toBeInTheDocument();
    expect(screen.getByText('Cape Town')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply my edits to latest' }));
    expect(props.onApplyConflictToLatest).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Discard my edits' }));
    expect(props.onRequestDiscardConflict).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(props.onKeepEditingAfterConflict).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before discarding conflict edits', () => {
    const original = makeNurse();
    const latest = { ...original, version: 4 };
    const props = makeProps({
      nurseSlice: makeSlice({
        originalBase: original,
        draft: { ...original, city: 'Cape Town' },
        saveDecision: { type: 'saveConflict', latest },
        discardDecision: { type: 'discardConflict', latest },
      }),
      onResolveDiscard: vi.fn(() => ({ status: 'discarded' })),
    });
    render(<NurseCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm discard' }));
    expect(props.onResolveDiscard).toHaveBeenCalledWith(true);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('requires another explicit save after a completed rebase', () => {
    const latest = makeNurse({ city: 'Johannesburg', province: 'Western Cape', version: 4 });
    const rebased = { ...latest, city: 'Cape Town' };
    const props = makeProps({
      nurseSlice: makeSlice({
        selected: latest,
        originalBase: latest,
        draft: rebased,
        baseVersion: 4,
        saveState: 'idle',
        saveDecision: null,
      }),
    });
    render(<NurseCard {...props} />);

    expect(screen.getByText('Base version 4')).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  it('disables edit and delete controls for a non-operational role without changing command availability', () => {
    const original = makeNurse();
    const draft = { ...original, city: 'Cape Town' };
    const props = makeProps({
      nurseSlice: makeSlice({ originalBase: original, draft }),
      permissions: {
        canCreate: false,
        canEdit: false,
        canChangePipeline: false,
        canDelete: false,
      },
    });
    render(<NurseCard {...props} />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete nurse' })).not.toBeInTheDocument();
    expect(typeof props.onSave).toBe('function');
    expect(typeof props.onConfirmDelete).toBe('function');
  });

  it.each(['deleted', 'alreadyDeleted'])(
    'requests deletion separately from confirmation and resolves confirmed %s convergence',
    async (status) => {
      const nurse = makeNurse();
      const result = { status };
      const props = makeProps({
        nurseSlice: makeSlice({
          selected: nurse,
          draft: nurse,
          deleteDecision: {
            type: 'confirmDelete',
            id: nurse.id,
            baseVersion: nurse.version,
            nurseName: nurse.fullName,
          },
        }),
        onConfirmDelete: vi.fn().mockResolvedValue(result),
      });
      render(<NurseCard {...props} />);

      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete nurse' })
      );

      await waitFor(() => expect(props.onConfirmDelete).toHaveBeenCalledTimes(1));
      expect(props.onDeleteResolved).toHaveBeenCalledWith(result);
    }
  );

  it('treats already-deleted reload convergence as resolved without issuing a delete', async () => {
    const nurse = makeNurse();
    const props = makeProps({
      nurseSlice: makeSlice({
        selected: nurse,
        draft: nurse,
        deleteState: 'error',
        deleteDecision: {
          type: 'deleteConflict',
          id: nurse.id,
          current: { ...nurse, version: nurse.version + 1 },
        },
      }),
      onReloadAfterDeleteConflict: vi.fn().mockResolvedValue({ status: 'notFound' }),
    });
    render(<NurseCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload Details' }));

    await waitFor(() =>
      expect(props.onDeleteResolved).toHaveBeenCalledWith({ status: 'notFound' })
    );
    expect(props.onConfirmDelete).not.toHaveBeenCalled();
  });

  it('handles not-found detail and recoverable detail retry/close actions', () => {
    const notFoundProps = makeProps({
      nurseSlice: makeSlice({ detailState: 'notFound', draft: null }),
    });
    const { rerender } = render(<NurseCard {...notFoundProps} />);
    expect(
      screen.getByRole('heading', { name: 'This nurse no longer exists' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(notFoundProps.onClose).toHaveBeenCalledTimes(1);

    const errorProps = makeProps({
      nurseSlice: makeSlice({
        detailState: 'error',
        draft: null,
        detailError: { code: 'NETWORK', message: 'Offline.' },
      }),
    });
    rerender(<NurseCard {...errorProps} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(errorProps.onRetryDetail).toHaveBeenCalledTimes(1);
  });

  it('keeps score labels, weights, controls, values, and callbacks while allowing narrow rows to wrap', () => {
    const props = makeProps();
    render(<NurseCard {...props} />);
    const scoreFields = [
      ['Hospital Exp', 3],
      ['SANC Status', 3],
      ['Qualifications', 2],
      ['Specialisation', 1],
      ['Financial Readiness', 1],
      ['Motivation', 2],
      ['Passport', 1],
    ];

    for (const [label, weight] of scoreFields) {
      const controls = [1, 2, 3, 4, 5].map((score) =>
        screen.getByRole('button', { name: `${label} ${score}` })
      );
      const row = controls[0].parentElement.parentElement;
      const controlGroup = controls[0].parentElement;

      expect(row).toHaveClass(
        'flex',
        'min-w-0',
        'flex-wrap',
        'items-center',
        'md:flex-nowrap'
      );
      expect(row.firstElementChild).toHaveClass(
        'w-full',
        'min-w-0',
        'shrink-0',
        'md:w-36'
      );
      expect(controlGroup).toHaveClass('min-w-0', 'flex-wrap', 'md:flex-nowrap');
      expect(row).toHaveTextContent(`${label} (x${weight})`);
      expect(controls).toHaveLength(5);
      expect(controls.map((control) => control.textContent)).toEqual(['1', '2', '3', '4', '5']);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Hospital Exp 4' }));
    expect(props.onUpdateDraft).toHaveBeenCalledTimes(1);
    const applyScoreUpdate = props.onUpdateDraft.mock.calls[0][0];
    const updated = applyScoreUpdate(makeNurse());
    expect(updated.scorecardFields.hospitalExp).toBe(4);
  });

  it('constrains intrinsic edit-select widths only below the desktop breakpoint', () => {
    render(<NurseCard {...makeProps()} />);

    expect(screen.getByLabelText('Gender')).toHaveClass(
      'min-w-0',
      'max-w-full',
      'md:max-w-none'
    );
  });

  it('preserves footer control order and the single primary action instance', () => {
    const { container } = render(<NurseCard {...makeProps()} />);
    const dialog = screen.getByRole('dialog', { name: 'Thandi Nkosi' });
    const controls = [...dialog.querySelectorAll('button')].map((button) =>
      button.textContent.trim()
    );
    const scrollRegion = dialog.querySelector('[data-nurse-card-scroll-region="true"]');
    const actionRegion = dialog.querySelector('[data-nurse-card-action-region="true"]');

    expect(document.body.contains(dialog)).toBe(true);
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveClass('nurse-card-frame', 'min-h-0', 'overflow-hidden');
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(actionRegion).toHaveClass('shrink-0', 'flex-col', 'md:flex-row');
    expect(controls.filter((name) => name === 'Save changes')).toHaveLength(1);
    expect(controls.indexOf('Delete nurse')).toBeLessThan(controls.indexOf('Cancel'));
    expect(controls.indexOf('Cancel')).toBeLessThan(controls.indexOf('Save changes'));
  });

  it('preserves action availability without invoking commands across generated permission and pending states', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (canEdit, pending) => {
        const original = makeNurse();
        const draft = { ...original, city: 'Cape Town' };
        const props = makeProps({
          nurseSlice: makeSlice({
            originalBase: original,
            draft,
            saveState: pending ? 'loading' : 'idle',
          }),
          permissions: { canEdit, canDelete: true },
        });
        const view = render(<NurseCard {...props} />);
        const action = screen.getByRole('button', { name: pending ? 'Saving...' : 'Save changes' });

        expect(action.disabled).toBe(pending || !canEdit);
        expect(props.onSave).not.toHaveBeenCalled();
        expect(props.onRequestDelete).not.toHaveBeenCalled();
        view.unmount();
      }),
      { seed: 20260624, numRuns: 8 }
    );
  });
});
