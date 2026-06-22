import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import NurseDatabase from './pages/NurseDatabase';
import AcquisitionHub from './pages/AcquisitionHub';
import CohortManager from './pages/CohortManager';
import OutreachLog from './pages/OutreachLog';
import PlacementTracker from './pages/PlacementTracker';
import Analytics from './pages/Analytics';
import { initializeData } from './lib/storage';
import { AppProvider } from './context/AppContext';

export default function App() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nurses" element={<NurseDatabase />} />
            <Route path="/acquisition" element={<AcquisitionHub />} />
            <Route path="/cohorts" element={<CohortManager />} />
            <Route path="/outreach" element={<OutreachLog />} />
            <Route path="/placements" element={<PlacementTracker />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
