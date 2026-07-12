import { lazy,useEffect } from 'react';
import { BrowserRouter, Route,Routes } from 'react-router-dom';

import ErrorBoundary from './components/layout/ErrorBoundary';
import Layout from './components/layout/Layout';
import RequireAuth from './components/layout/RequireAuth';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AuthProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
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
            <Route path="/status" element={<StatusPage />} />
          </Route>
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AppProvider>
    </ErrorBoundary>
  );
}
