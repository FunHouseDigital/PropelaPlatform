import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createBlankNurseDraft } from '../../../lib/nurses/nurseWorkflow';
import NurseCreateModal from '../NurseCreateModal';

vi.mock('../../../hooks/useMediaQuery', () => ({
  default: () => true,
}));

const UUID = '123e4567-e89b-42d3-a456-426614174000';

function makeDraft(overrides = {}) {
  return {
    ...createBlankNurseDraft({
      now: new Date('2026-06-24T12:00:00'),
      randomUUID: () => UUID,
    }),
    ...overrides,
  };
}

function makeProps(slice = {}, overrides = {}) {
  return {
    isOpen: true,
    nurseSlice: {
      createDraft: makeDraft(),
      createState: 'idle',
      createError: null,
      createValidation: null,
      createDecision: null,
      ...slice,
    },
    onUpdateDraft: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(async () => ({ status: 'saved', nurse: { id: `nurse-${UUID}` } })),
    onRetry: vi.fn(),
    onRetryCollision: vi.fn(),
    onCommitted: vi.fn(),
    ...overrides,
  };
}

describe('NurseCreateModal', () => {
  it('renders a named modal, closes by keyboard, and never exposes authoritative metadata inputs', () => {
    const props = makeProps();
    render(<NurseCreateModal {...props} />);

    expect(screen.getByRole('dialog', { name: 'Add Nurse' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/owner id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^version$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^id$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/created at|updated at/i)).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('reports inline validation and focuses the first invalid field without submitting', () => {
    const props = makeProps();
    render(<NurseCreateModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create nurse' }));

    const fullName = screen.getByRole('textbox', { name: 'Full name' });
    expect(fullName).toHaveFocus();
    expect(fullName).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while the first committed request is unresolved', async () => {
    let resolveRequest;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const props = makeProps(
      { createDraft: makeDraft({ fullName: 'New Nurse' }) },
      { onSubmit: vi.fn(() => pending) }
    );
    render(<NurseCreateModal {...props} />);

    const submit = screen.getByRole('button', { name: 'Create nurse' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    resolveRequest({ status: 'saved', nurse: { id: `nurse-${UUID}` } });
    await waitFor(() => expect(props.onCommitted).toHaveBeenCalledTimes(1));
  });

  it('closes through the committed callback only for a saved result', async () => {
    const failedProps = makeProps(
      { createDraft: makeDraft({ fullName: 'Kept Nurse' }) },
      { onSubmit: vi.fn(async () => ({ status: 'error' })) }
    );
    const { rerender } = render(<NurseCreateModal {...failedProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create nurse' }));
    await waitFor(() => expect(failedProps.onSubmit).toHaveBeenCalledTimes(1));
    expect(failedProps.onCommitted).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add Nurse' })).toBeInTheDocument();

    const savedProps = makeProps(
      { createDraft: makeDraft({ fullName: 'Kept Nurse' }) },
      {
        onSubmit: vi.fn(async () => ({
          status: 'saved',
          nurse: { id: `nurse-${UUID}`, fullName: 'Kept Nurse', version: 1 },
        })),
      }
    );
    rerender(<NurseCreateModal {...savedProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create nurse' }));

    await waitFor(() =>
      expect(savedProps.onCommitted).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Kept Nurse', version: 1 })
      )
    );
  });

  it('preserves all controlled values after a recoverable failure and manual retry', async () => {
    const draft = makeDraft({
      fullName: 'Preserved Nurse',
      preferredName: 'Preserved',
      email: 'preserved@example.test',
      contactNumber: '+27 82 000 0000',
      city: 'Cape Town',
      cohortAssigned: 'Cohort 3',
      motivations: 'Preserve every field',
      questions: 'Retain this question',
      notesFlags: 'Retain this note',
      efSetScore: 72,
      englishPts: 2.5,
      agreementSigned: true,
      additionalCertifications: ['ICU', 'Trauma'],
      scorecardFields: {
        hospitalExp: 1,
        sancStatus: 2,
        qualifications: 3,
        specialisation: 4,
        financialReadiness: 5,
        motivation: 4,
        passport: 3,
      },
    });
    const props = makeProps(
      {
        createDraft: draft,
        createState: 'error',
        createError: { code: 'NETWORK', message: 'Connection lost.' },
        createDecision: { type: 'createFailure', retryAvailable: true },
      },
      { onRetry: vi.fn(async () => ({ status: 'error' })) }
    );
    render(<NurseCreateModal {...props} />);

    const expectedValues = {
      'Full name': 'Preserved Nurse',
      'Preferred name': 'Preserved',
      Email: 'preserved@example.test',
      'Contact number': '+27 82 000 0000',
      City: 'Cape Town',
      Cohort: 'Cohort 3',
      Motivations: 'Preserve every field',
      Questions: 'Retain this question',
      'Notes and flags': 'Retain this note',
      'EF SET score': 72,
      'English points': 2.5,
      'Hospital experience': 1,
      'SANC status': 2,
      Qualifications: 3,
      Specialisation: 4,
      'Financial readiness': 5,
      Motivation: 4,
      Passport: 3,
      'Additional certifications': 'ICU\nTrauma',
    };
    const expectDraftValues = () => {
      for (const [label, value] of Object.entries(expectedValues)) {
        expect(screen.getByLabelText(label)).toHaveValue(value);
      }
      expect(screen.getByRole('checkbox', { name: 'Agreement signed' })).toBeChecked();
    };

    expectDraftValues();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(props.onRetry).toHaveBeenCalledTimes(1));
    expectDraftValues();
    expect(screen.getByRole('dialog', { name: 'Add Nurse' })).toBeInTheDocument();
  });

  it.each([
    ['AUTH', 'Authentication required'],
    ['FORBIDDEN', 'Permission denied'],
    ['VALIDATION', 'Check the highlighted fields'],
  ])('does not expose manual retry for a non-recoverable %s failure', (code, title) => {
    const props = makeProps({
      createDraft: makeDraft({ fullName: 'Kept Nurse' }),
      createState: 'error',
      createError: { code, message: 'Resolve this condition before another attempt.' },
      createDecision: { type: 'createFailure', retryAvailable: false },
    });

    render(<NurseCreateModal {...props} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Kept Nurse');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('uses the explicit collision retry command and retains entered business fields', () => {
    const draft = makeDraft({ fullName: 'Collision Nurse', city: 'Cape Town' });
    const props = makeProps({
      createDraft: draft,
      createState: 'error',
      createError: { code: 'CONFLICT', message: 'Identifier collision.' },
      createDecision: { type: 'createCollision', retryAvailable: true },
    });
    render(<NurseCreateModal {...props} />);

    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Collision Nurse');
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('Cape Town');
    fireEvent.click(screen.getByRole('button', { name: 'Retry with a new ID' }));
    expect(props.onRetryCollision).toHaveBeenCalledTimes(1);
    expect(props.onRetry).not.toHaveBeenCalled();
  });

  it('preserves field and action order with one primary action', () => {
    render(<NurseCreateModal {...makeProps()} />);
    const dialog = screen.getByRole('dialog', { name: 'Add Nurse' });
    const controls = [...dialog.querySelectorAll('input, select, textarea, button')];
    const names = controls.map(
      (control) =>
        control.getAttribute('aria-label') ||
        control.getAttribute('aria-labelledby') ||
        control.textContent.trim()
    );

    expect(names.filter((name) => name === 'Create nurse')).toHaveLength(1);
    expect(names.indexOf('fullName-label')).toBeLessThan(names.indexOf('preferredName-label'));
    expect(names.indexOf('Cancel')).toBeLessThan(names.indexOf('Create nurse'));

    const form = dialog.querySelector('form');
    const scrollRegion = dialog.querySelector('[data-nurse-create-scroll-region="true"]');
    const actionRegion = dialog.querySelector('[data-nurse-create-action-region="true"]');
    expect(form).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(actionRegion).toHaveClass('shrink-0', 'flex-wrap', 'bg-white');
    expect(form).toContainElement(scrollRegion);
    expect(form).toContainElement(actionRegion);
    expect(scrollRegion).not.toContainElement(actionRegion);
    expect(scrollRegion.compareDocumentPosition(actionRegion)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('keeps the pending draft visible and prevents close or duplicate submit commands', () => {
    const props = makeProps({
      createDraft: makeDraft({ fullName: 'Pending Draft' }),
      createState: 'loading',
    });
    render(<NurseCreateModal {...props} />);

    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Pending Draft');
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
