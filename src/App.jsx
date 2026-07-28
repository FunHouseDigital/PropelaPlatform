import { lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';
import RequirePermission from './components/auth/RequirePermission';
import ErrorBoundary from './components/layout/ErrorBoundary';
import Layout from './components/layout/Layout';
import RequireAuth from './components/layout/RequireAuth';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { isFeatureEnabled } from './lib/featureFlags';
import { ROUTE_PERMISSIONS } from './lib/permissions';
import { initializeApplicationStorage } from './lib/storage';
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

/**
 * The per-page route elements, each wrapped in RequirePermission so the LIVE
 * role-permission matrix (settings.rolePermissions, via usePermissions) gates
 * every page. This RBAC layer is UNIFIED across both auth modes: it is driven
 * only by AuthContext's derived `currentUser.role`, which resolves to the
 * hardened-localStorage user's role when the flag is OFF and to the Supabase
 * `profiles` role when the flag is ON. A Superadmin/Admin therefore sees
 * everything and a Read-only / no-role user is gated identically in both modes.
 */
function guardedPageRoutes() {
  return PROTECTED_ROUTES.map(({ path, element }) => (
    <Route
      key={path}
      path={path}
      element={
        <RequirePermission module={ROUTE_PERMISSIONS[path]}>
          {element}
        </RequirePermission>
      }
    />
  ));
}

/**
 * Flag OFF (default / live): hardened localStorage auth + RBAC. Routes are
 * gated by ProtectedRoute (requires an authenticated user) and each page is
 * additionally wrapped in RequirePermission using ROUTE_PERMISSIONS.
 */
function LegacyRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated routes (redirect to /login when signed out) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>{guardedPageRoutes()}</Route>
      </Route>

      {/* Unknown routes fall back to the dashboard (which itself is gated) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Flag ON: Supabase auth. The AUTH gate is RequireAuth (rather than
 * ProtectedRoute) because the Supabase path needs behaviour ProtectedRoute
 * does not provide: it waits out session hydration (avoiding a premature
 * redirect on a transient null) and forces re-authentication on an expired
 * session. The RBAC layer, however, is the SAME `guardedPageRoutes()` used by
 * the legacy path — so RequirePermission enforces the identical permission
 * model on the Supabase routes, driven by the profile role surfaced through
 * AuthContext. (Only two Superadmins exist today, so in practice they see every
 * page; the gating exists so a null/Read-only role is still correctly blocked.)
 */
function SupabaseRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {guardedPageRoutes()}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const useSupabase = isFeatureEnabled('SUPABASE_BACKEND');

  useEffect(() => {
    initializeApplicationStorage(useSupabase);
  }, [useSupabase]);

  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            {useSupabase ? <SupabaseRoutes /> : <LegacyRoutes />}
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
