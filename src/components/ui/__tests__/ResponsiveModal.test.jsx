import { render, screen, fireEvent } from '../../../test/utils';
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
    const { container } = render(
      <ResponsiveModal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </ResponsiveModal>
    );

    const backdrop = container.querySelector('.bg-black\\/50');
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
});
