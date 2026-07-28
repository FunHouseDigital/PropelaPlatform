import { cleanup, fireEvent, render, screen } from '../../../test/utils';
import DeleteNurseDialog from '../DeleteNurseDialog';

function renderDialog(overrides = {}) {
  const props = {
    decision: {
      type: 'confirmDelete',
      id: 'nurse-1',
      baseVersion: 3,
      nurseName: 'Thandi Nkosi',
    },
    deleteState: 'idle',
    error: null,
    fallbackNurseName: 'Thandi Nkosi',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    onRetry: vi.fn(),
    onReload: vi.fn(),
    ...overrides,
  };
  render(<DeleteNurseDialog {...props} />);
  return props;
}

describe('DeleteNurseDialog', () => {
  it('names the nurse, warns safely, focuses Cancel, traps focus, and issues no delete on cancel', () => {
    const props = renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Thandi Nkosi?' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Delete nurse' });

    expect(dialog).toHaveTextContent(
      'Related database records may be affected according to database rules'
    );
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.click(cancel);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('supports Escape before submission but ignores Escape while deletion is pending', () => {
    const props = renderDialog();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();

    cleanup();
    const pendingProps = renderDialog({ deleteState: 'loading' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(pendingProps.onCancel).not.toHaveBeenCalled();
  });

  it('keeps the dialog visible and disables duplicate confirmation while pending', () => {
    const props = renderDialog({ deleteState: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Deleting Thandi Nkosi');
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Deleting…' }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('offers Reload Details and Cancel only for a stale conflict', () => {
    const props = renderDialog({
      decision: {
        type: 'deleteConflict',
        id: 'nurse-1',
        current: { fullName: 'Thandi Nkosi', version: 4 },
      },
      deleteState: 'error',
    });

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'changed after these details were loaded'
    );
    expect(screen.getByRole('button', { name: 'Reload Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete nurse|retry delete/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reload Details' }));
    expect(props.onReload).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['VALIDATION', 'Deletion blocked by a database rule', 'database rule prevented it'],
    ['AUTH', 'Sign in before deleting', 'session is no longer valid'],
    ['FORBIDDEN', 'Permission required', 'do not currently have permission'],
  ])('shows a safe %s failure without retry', (code, title, message) => {
    renderDialog({
      decision: { type: 'deleteFailure', nurseName: 'Thandi Nkosi', retryAvailable: false },
      deleteState: 'error',
      error: { code, message: 'raw backend details must not be displayed' },
    });

    expect(screen.getByRole('alertdialog', { name: title })).toHaveTextContent(message);
    expect(screen.queryByText('raw backend details must not be displayed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry delete' })).not.toBeInTheDocument();
  });

  it.each(['NETWORK', 'UNKNOWN', 'STORAGE'])(
    'offers manual retry for recoverable %s failures',
    (code) => {
      const props = renderDialog({
        decision: { type: 'deleteFailure', nurseName: 'Thandi Nkosi', retryAvailable: true },
        deleteState: 'error',
        error: { code, message: 'safe normalized failure' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Retry delete' }));
      expect(props.onRetry).toHaveBeenCalledTimes(1);
    }
  );
});
