import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor } from '../../test/utils';
import { initializeData } from '../../lib/storage';

// Lazy-load pages exactly as the app does
const Dashboard = lazy(() => import('../Dashboard'));
const NurseDatabase = lazy(() => import('../NurseDatabase'));
const AcquisitionHub = lazy(() => import('../AcquisitionHub'));
const CohortManager = lazy(() => import('../CohortManager'));
const OutreachLog = lazy(() => import('../OutreachLog'));
const PlacementTracker = lazy(() => import('../PlacementTracker'));
const Analytics = lazy(() => import('../Analytics'));
const DocumentManagement = lazy(() => import('../DocumentManagement'));
const Communications = lazy(() => import('../Communications'));
const Reports = lazy(() => import('../Reports'));
const Integrations = lazy(() => import('../Integrations'));
const AuditTrail = lazy(() => import('../AuditTrail'));
const Automations = lazy(() => import('../Automations'));
const Notifications = lazy(() => import('../Notifications'));
const Help = lazy(() => import('../Help'));
const Settings = lazy(() => import('../Settings'));

function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nurses" element={<NurseDatabase />} />
        <Route path="/acquisition" element={<AcquisitionHub />} />
        <Route path="/cohorts" element={<CohortManager />} />
        <Route path="/outreach" element={<OutreachLog />} />
        <Route path="/placements" element={<PlacementTracker />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/documents" element={<DocumentManagement />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

describe('Page renders - all 16 routes', () => {
  beforeEach(() => {
    localStorage.clear();
    initializeData();
  });

  const routes = [
    { path: '/', name: 'Dashboard' },
    { path: '/nurses', name: 'Nurse Database' },
    { path: '/acquisition', name: 'Acquisition Hub' },
    { path: '/cohorts', name: 'Cohort Manager' },
    { path: '/outreach', name: 'Outreach Log' },
    { path: '/placements', name: 'Placements' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/documents', name: 'Document Management' },
    { path: '/communications', name: 'Communications' },
    { path: '/reports', name: 'Reports' },
    { path: '/integrations', name: 'Integrations' },
    { path: '/audit', name: 'Audit Trail' },
    { path: '/automations', name: 'Automations' },
    { path: '/notifications', name: 'Notifications' },
    { path: '/help', name: 'Help' },
    { path: '/settings', name: 'Settings' },
  ];

  it.each(routes)('renders $name page at $path without errors', async ({ path }) => {
    const { container } = render(<AppRoutes />, { route: path });

    // Wait for lazy-loaded content to appear (suspense fallback disappears)
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // The page should render something meaningful (not empty)
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
