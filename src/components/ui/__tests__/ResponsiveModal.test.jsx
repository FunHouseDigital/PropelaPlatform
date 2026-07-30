import { fireEvent, render, screen } from '../../../test/utils';
import ResponsiveModal from '../ResponsiveModal';

// Mock useMediaQuery to default to desktop
vi.mock('../../../hooks/useMediaQuery', () => ({
  default: () => true, // isDesktop = true
}));

describe('ResponsiveModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ResponsiveModal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </ResponsiveModal>
    );
    expect(container.querySelector('.fixed')).not.toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders content when isOpen is true', () => {
    render(
      <ResponsiveModal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content here</p>
      </ResponsiveModal>
    );
    expect(screen.getByText('Modal content here')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(
      <ResponsiveModal isOpen={true} onClose={vi.fn()} title="My Title">
        <p>Content</p>
      </ResponsiveModal>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ResponsiveModal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </ResponsiveModal>
    );

    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <ResponsiveModal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </ResponsiveModal>
    );

    const backdrop = document.body.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders children inside the modal body', () => {
    render(
      <ResponsiveModal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div data-testid="child">Hello</div>
      </ResponsiveModal>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('preserves the named dialog and enabled control order', () => {
    render(
      <ResponsiveModal isOpen onClose={vi.fn()} title="Ordered Modal">
        <button type="button">First action</button>
        <input aria-label="Middle field" />
        <button type="button">Last action</button>
      </ResponsiveModal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Ordered Modal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')].map(
        (control) => control.getAttribute('aria-label') || control.textContent
      )
    ).toEqual(['Close modal', 'First action', 'Middle field', 'Last action']);
  });

  it('traps forward and reverse tab focus and restores the invoker on close', () => {
    const invoker = document.createElement('button');
    invoker.textContent = 'Open modal';
    document.body.appendChild(invoker);
    invoker.focus();

    const { rerender } = render(
      <ResponsiveModal isOpen onClose={vi.fn()} title="Focus Modal">
        <button type="button">Final action</button>
      </ResponsiveModal>
    );
    const close = screen.getByRole('button', { name: 'Close modal' });
    const final = screen.getByRole('button', { name: 'Final action' });
    expect(close).toHaveFocus();

    final.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(final).toHaveFocus();

    rerender(
      <ResponsiveModal isOpen={false} onClose={vi.fn()} title="Focus Modal">
        <button type="button">Final action</button>
      </ResponsiveModal>
    );
    expect(invoker).toHaveFocus();
    invoker.remove();
  });

  it('does not close or move focus outside while close is disabled', () => {
    const onClose = vi.fn();
    render(
      <ResponsiveModal isOpen closeDisabled onClose={onClose} title="Pending Modal">
        <button type="button">Only enabled child</button>
      </ResponsiveModal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeDisabled();
  });

  it('portals the bounded frame to body and applies the default scroll contract', () => {
    const { container } = render(
      <ResponsiveModal isOpen onClose={vi.fn()} title="Portaled Modal">
        <p>Default content</p>
      </ResponsiveModal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Portaled Modal' });
    expect(document.body.contains(dialog)).toBe(true);
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveAttribute('data-modal-frame', 'true');
    expect(dialog).toHaveClass('responsive-modal-frame', 'flex', 'min-h-0', 'overflow-hidden');
    expect(dialog.querySelector('[data-modal-body="default"]')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
      'p-4'
    );
  });

  it('supports a contained body without introducing a second scroll owner', () => {
    render(
      <ResponsiveModal isOpen bodyMode="contained" onClose={vi.fn()} title="Contained Modal">
        <div data-testid="owned-scroll">Complex child</div>
      </ResponsiveModal>
    );

    const body = screen
      .getByRole('dialog', { name: 'Contained Modal' })
      .querySelector('[data-modal-body="contained"]');
    expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden');
    expect(body).not.toHaveClass('overflow-y-auto', 'p-4');
  });
});
