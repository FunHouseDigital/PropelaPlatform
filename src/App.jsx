import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import NurseDatabase from './pages/NurseDatabase';
import AcquisitionHub from './pages/AcquisitionHub';
import CohortManager from './pages/CohortManager';
import OutreachLog from './pages/OutreachLog';
import { initializeData } from './lib/storage';

export default function App() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nurses" element={<NurseDatabase />} />
          <Route path="/acquisition" element={<AcquisitionHub />} />
          <Route path="/cohorts" element={<CohortManager />} />
          <Route path="/outreach" element={<OutreachLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
