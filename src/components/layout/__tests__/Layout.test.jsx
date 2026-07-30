import { render, screen, fireEvent } from '../../../test/utils';
import Layout from '../Layout';

// Mock child components to isolate Layout behavior
vi.mock('../Sidebar', () => ({
  default: ({ isOpen, isMobile }) => (
    <aside data-testid="sidebar" data-open={isOpen} data-mobile={isMobile}>
      Sidebar
    </aside>
  ),
}));

vi.mock('../Header', () => ({
  default: ({ onOpenSearch, onToggleSidebar, isMobile }) => (
    <header data-testid="header" data-mobile={isMobile}>
      <button onClick={onOpenSearch} data-testid="open-search">Search</button>
      <button onClick={onToggleSidebar} data-testid="toggle-sidebar">Toggle</button>
    </header>
  ),
}));

vi.mock('../MobileBottomNav', () => ({
  default: ({ onOpenSidebar }) => (
    <nav data-testid="mobile-bottom-nav">
      <button onClick={onOpenSidebar}>More</button>
    </nav>
  ),
}));

vi.mock('../../search/CommandPalette', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? <div data-testid="command-palette"><button onClick={onClose}>Close Palette</button></div> : null,
}));

vi.mock('../../help/OnboardingWizard', () => ({
  default: () => null,
}));

vi.mock('../OfflineBanner', () => ({
  default: () => null,
}));

vi.mock('../InstallPrompt', () => ({
  default: () => null,
}));

vi.mock('../LoadingSpinner', () => ({
  default: () => <div>Loading...</div>,
}));

// Mock useMediaQuery to control desktop/mobile
let mockIsMobile = false;
vi.mock('../../../hooks/useMediaQuery', () => ({
  default: () => mockIsMobile,
}));

describe('Layout', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders Sidebar and Header', () => {
    render(<Layout />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders main content area inside a shrinkable page shell', () => {
    render(<Layout />);
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main.parentElement).toHaveClass('min-w-0');
  });

  it('does not render MobileBottomNav on desktop', () => {
    mockIsMobile = false;
    render(<Layout />);
    expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();
  });

  it('renders MobileBottomNav on mobile', () => {
    mockIsMobile = true;
    render(<Layout />);
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
  });

  it('sidebar is open by default on desktop', () => {
    mockIsMobile = false;
    render(<Layout />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
  });

  it('sidebar is closed by default on mobile', () => {
    mockIsMobile = true;
    render(<Layout />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
  });

  it('opens command palette with Cmd+K shortcut', () => {
    render(<Layout />);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('opens command palette with Ctrl+K shortcut', () => {
    render(<Layout />);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('toggles command palette off with repeated Cmd+K', () => {
    render(<Layout />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('opens command palette via search button callback', () => {
    render(<Layout />);
    fireEvent.click(screen.getByTestId('open-search'));
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });
});
