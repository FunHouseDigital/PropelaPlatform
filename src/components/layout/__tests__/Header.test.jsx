import { render, screen, fireEvent } from '../../../test/utils';
import Header from '../Header';

// Mock the SmartSuggestions and Breadcrumbs components to isolate Header
vi.mock('../Breadcrumbs', () => ({
  default: () => <nav data-testid="breadcrumbs">Breadcrumbs</nav>,
}));

vi.mock('../../search/SmartSuggestions', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="smart-suggestions">Suggestions</div> : null,
}));

describe('Header', () => {
  it('renders breadcrumbs', () => {
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={vi.fn()} isMobile={false} />);
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  it('renders the search button', () => {
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={vi.fn()} isMobile={false} />);
    expect(screen.getByText('Search...')).toBeInTheDocument();
  });

  it('calls onOpenSearch when search button is clicked', () => {
    const onOpenSearch = vi.fn();
    render(<Header onOpenSearch={onOpenSearch} onToggleSidebar={vi.fn()} isMobile={false} />);

    fireEvent.click(screen.getByText('Search...'));
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it('shows hamburger button when isMobile is true', () => {
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={vi.fn()} isMobile={true} />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  it('does not show hamburger button when isMobile is false', () => {
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={vi.fn()} isMobile={false} />);
    expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument();
  });

  it('calls onToggleSidebar when hamburger is clicked', () => {
    const onToggleSidebar = vi.fn();
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={onToggleSidebar} isMobile={true} />);

    fireEvent.click(screen.getByLabelText('Open menu'));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('toggles smart suggestions on button click', () => {
    render(<Header onOpenSearch={vi.fn()} onToggleSidebar={vi.fn()} isMobile={false} />);

    // Suggestions not visible initially
    expect(screen.queryByTestId('smart-suggestions')).not.toBeInTheDocument();

    // Click the toggle button (sparkles icon button)
    const buttons = screen.getAllByRole('button');
    const sparklesButton = buttons.find((btn) =>
      btn.className.includes('w-8 h-8')
    );
    fireEvent.click(sparklesButton);

    expect(screen.getByTestId('smart-suggestions')).toBeInTheDocument();
  });
});
