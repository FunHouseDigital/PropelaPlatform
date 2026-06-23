import { render, screen, fireEvent } from '../../../test/utils';
import MobileBottomNav from '../MobileBottomNav';

describe('MobileBottomNav', () => {
  it('renders 4 bottom nav items', () => {
    render(<MobileBottomNav onOpenSidebar={vi.fn()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Nurses')).toBeInTheDocument();
    expect(screen.getByText('Placements')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders the More button', () => {
    render(<MobileBottomNav onOpenSidebar={vi.fn()} />);
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('nav items link to correct paths', () => {
    render(<MobileBottomNav onOpenSidebar={vi.fn()} />);

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Nurses').closest('a')).toHaveAttribute('href', '/nurses');
    expect(screen.getByText('Placements').closest('a')).toHaveAttribute('href', '/placements');
    expect(screen.getByText('Alerts').closest('a')).toHaveAttribute('href', '/notifications');
  });

  it('highlights active nav item', () => {
    render(<MobileBottomNav onOpenSidebar={vi.fn()} />, { route: '/nurses' });

    const nursesLink = screen.getByText('Nurses').closest('a');
    expect(nursesLink.className).toContain('text-propela-purple');
  });

  it('calls onOpenSidebar when More button is clicked', () => {
    const onOpenSidebar = vi.fn();
    render(<MobileBottomNav onOpenSidebar={onOpenSidebar} />);

    fireEvent.click(screen.getByText('More'));
    expect(onOpenSidebar).toHaveBeenCalledTimes(1);
  });
});
