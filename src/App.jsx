import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import NurseDatabase from './pages/NurseDatabase'
import NurseCard from './pages/NurseCard'
import CohortManager from './pages/CohortManager'
import AcquisitionHub from './pages/AcquisitionHub'
import TemplateLibrary from './pages/TemplateLibrary'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nurses" element={<NurseDatabase />} />
        <Route path="/nurses/:id" element={<NurseCard />} />
        <Route path="/cohorts" element={<CohortManager />} />
        <Route path="/acquisition" element={<AcquisitionHub />} />
        <Route path="/templates" element={<TemplateLibrary />} />
      </Route>
    </Routes>
  )
}
