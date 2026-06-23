import { render, screen, fireEvent } from '../../../test/utils';
import Sidebar from '../Sidebar';

// Mock AppContext values to control notification badges
vi.mock('../../../context/AppContext', async () => {
  const actual = await vi.importActual('../../../context/AppContext');
  return {
    ...actual,
    useAppContext: () => ({
      notifications: [
        { id: '1', read: false },
        { id: '2', read: false },
        { id: '3', read: true },
      ],
      notificationAlerts: [
        { id: '1', read: false },
      ],
      nurses: [],
      placements: [],
      documents: [],
      cohorts: [],
    }),
  };
});

const NAV_ITEMS_EXPECTED = [
  { path: '/', label: 'Dashboard' },
  { path: '/nurses', label: 'Nurse Database' },
  { path: '/acquisition', label: 'Acquisition Hub' },
  { path: '/cohorts', label: 'Cohort Manager' },
  { path: '/outreach', label: 'Outreach Log' },
  { path: '/placements', label: 'Placements' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/reports', label: 'Reports' },
  { path: '/documents', label: 'Documents' },
  { path: '/communications', label: 'Communications' },
  { path: '/integrations', label: 'Integrations' },
  { path: '/audit', label: 'Audit Trail' },
  { path: '/automations', label: 'Automations' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/help', label: 'Help' },
  { path: '/settings', label: 'Settings' },
];

describe('Sidebar', () => {
  it('renders all 16 navigation items', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />);

    NAV_ITEMS_EXPECTED.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders NavLinks with correct paths', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />);

    NAV_ITEMS_EXPECTED.forEach(({ path, label }) => {
      const link = screen.getByText(label).closest('a');
      expect(link).toHaveAttribute('href', path);
    });
  });

  it('highlights the active nav item based on current route', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />, { route: '/nurses' });

    const nurseLink = screen.getByText('Nurse Database').closest('a');
    expect(nurseLink.className).toContain('bg-white/15');
  });

  it('shows notification badge for communications with unread count', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />);

    // 2 unread notifications (from mock)
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('shows notification badge for notifications tab with unread count', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />);

    // 1 unread notificationAlert (from mock)
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('shows close button when isMobile is true', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={true} />);

    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
  });

  it('does not show close button when isMobile is false', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={false} />);

    expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument();
  });

  it('calls onClose when mobile close button is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} isMobile={true} />);

    fireEvent.click(screen.getByLabelText('Close sidebar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when a nav link is clicked in mobile mode', () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} isMobile={true} />);

    fireEvent.click(screen.getByText('Dashboard'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when a nav link is clicked in desktop mode', () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} isMobile={false} />);

    fireEvent.click(screen.getByText('Dashboard'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies translate-x-0 class when open on mobile', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={vi.fn()} isMobile={true} />);
    const aside = container.querySelector('aside');
    expect(aside.className).toContain('translate-x-0');
  });

  it('applies -translate-x-full class when closed on mobile', () => {
    const { container } = render(<Sidebar isOpen={false} onClose={vi.fn()} isMobile={true} />);
    const aside = container.querySelector('aside');
    expect(aside.className).toContain('-translate-x-full');
  });
});
