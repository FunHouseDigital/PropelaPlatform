import { useEffect, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';
import RequirePermission from './components/auth/RequirePermission';
import ErrorBoundary from './components/layout/ErrorBoundary';
import Layout from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ROUTE_PERMISSIONS } from './lib/permissions';
import { initializeData } from './lib/storage';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const NurseDatabase = lazy(() => import('./pages/NurseDatabase'));
const AcquisitionHub = lazy(() => import('./pages/AcquisitionHub'));
const CohortManager = lazy(() => import('./pages/CohortManager'));
const OutreachLog = lazy(() => import('./pages/OutreachLog'));
const PlacementTracker = lazy(() => import('./pages/PlacementTracker'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DocumentManagement = lazy(() => import('./pages/DocumentManagement'));
const Communications = lazy(() => import('./pages/Communications'));
const Reports = lazy(() => import('./pages/Reports'));
const Integrations = lazy(() => import('./pages/Integrations'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const Settings = lazy(() => import('./pages/Settings'));
const Automations = lazy(() => import('./pages/Automations'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Help = lazy(() => import('./pages/Help'));
const StatusPage = lazy(() => import('./pages/StatusPage'));

// Each protected route maps to its page component. The required permission for
// every path lives in ROUTE_PERMISSIONS (src/lib/permissions.js), the single
// source shared with the navigation UI.
const PROTECTED_ROUTES = [
  { path: '/', element: <Dashboard /> },
  { path: '/nurses', element: <NurseDatabase /> },
  { path: '/acquisition', element: <AcquisitionHub /> },
  { path: '/cohorts', element: <CohortManager /> },
  { path: '/outreach', element: <OutreachLog /> },
  { path: '/placements', element: <PlacementTracker /> },
  { path: '/analytics', element: <Analytics /> },
  { path: '/documents', element: <DocumentManagement /> },
  { path: '/communications', element: <Communications /> },
  { path: '/reports', element: <Reports /> },
  { path: '/integrations', element: <Integrations /> },
  { path: '/audit', element: <AuditTrail /> },
  { path: '/automations', element: <Automations /> },
  { path: '/notifications', element: <Notifications /> },
  { path: '/help', element: <Help /> },
  { path: '/settings', element: <Settings /> },
  { path: '/status', element: <StatusPage /> },
];

export default function App() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated routes (redirect to /login when signed out) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  {PROTECTED_ROUTES.map(({ path, element }) => (
                    <Route
                      key={path}
                      path={path}
                      element={
                        <RequirePermission module={ROUTE_PERMISSIONS[path]}>
                          {element}
                        </RequirePermission>
                      }
                    />
                  ))}
                </Route>
              </Route>

              {/* Unknown routes fall back to the dashboard (which itself is gated) */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
