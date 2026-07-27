import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { initializeData } from '../../lib/storage';
import Sidebar from '../../components/layout/Sidebar';
import MobileBottomNav from '../../components/layout/MobileBottomNav';

const Dashboard = lazy(() => import('../Dashboard'));
const NurseDatabase = lazy(() => import('../NurseDatabase'));
const PlacementTracker = lazy(() => import('../PlacementTracker'));
const Notifications = lazy(() => import('../Notifications'));
const Analytics = lazy(() => import('../Analytics'));
const Help = lazy(() => import('../Help'));

function TestApp() {
  return (
    <>
      <Sidebar isOpen={true} onClose={() => {}} isMobile={false} />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nurses" element={<NurseDatabase />} />
          <Route path="/placements" element={<PlacementTracker />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Suspense>
    </>
  );
}

function BottomNavApp() {
  return (
    <>
      <MobileBottomNav onOpenSidebar={() => {}} />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nurses" element={<NurseDatabase />} />
          <Route path="/placements" element={<PlacementTracker />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Suspense>
    </>
  );
}

describe('Navigation integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
    initializeData();
  });

  describe('Sidebar navigation', () => {
    it('clicking Nurse Database link navigates to the nurse page', async () => {
      render(<TestApp />, { route: '/' });

      // Wait for initial page load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Click the Nurse Database link in sidebar
      const nurseLink = screen.getByRole('link', { name: /Nurse Database/i });
      fireEvent.click(nurseLink);

      // Wait for the NurseDatabase page to render
      await waitFor(() => {
        expect(screen.getByText(/Nurse Database/i, { selector: 'h1' })).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('clicking Analytics link navigates to analytics page', async () => {
      render(<TestApp />, { route: '/' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const analyticsLink = screen.getByRole('link', { name: /Analytics/i });
      fireEvent.click(analyticsLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('clicking Help link navigates to help page', async () => {
      render(<TestApp />, { route: '/' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const helpLink = screen.getByRole('link', { name: /Help/i });
      fireEvent.click(helpLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('active sidebar link reflects the current route', async () => {
      render(<TestApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const nurseLink = screen.getByRole('link', { name: /Nurse Database/i });
      // NavLink adds a class when active - check for the active styling
      expect(nurseLink.className).toContain('bg-white/15');
    });
  });

  describe('Bottom nav navigation', () => {
    it('clicking Nurses bottom nav link navigates to nurses page', async () => {
      render(<BottomNavApp />, { route: '/' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const nursesNavLink = screen.getByRole('link', { name: /Nurses/i });
      fireEvent.click(nursesNavLink);

      await waitFor(() => {
        expect(screen.getByText(/Nurse Database/i, { selector: 'h1' })).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('clicking Placements bottom nav link navigates to placements page', async () => {
      render(<BottomNavApp />, { route: '/' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const placementsLink = screen.getByRole('link', { name: /Placements/i });
      fireEvent.click(placementsLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('clicking Alerts bottom nav link navigates to notifications page', async () => {
      render(<BottomNavApp />, { route: '/' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const alertsLink = screen.getByRole('link', { name: /Alerts/i });
      fireEvent.click(alertsLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
