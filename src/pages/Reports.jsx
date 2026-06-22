import { useState } from 'react';
import { FileText, Clock, Download, LayoutGrid } from 'lucide-react';
import ReportBuilder from '../components/reports/ReportBuilder';
import ScheduledReports from '../components/reports/ScheduledReports';
import ExportCenter from '../components/reports/ExportCenter';
import DashboardWidgets from '../components/reports/DashboardWidgets';

const TABS = [
  { id: 'builder', label: 'Report Builder', icon: FileText },
  { id: 'scheduled', label: 'Scheduled Reports', icon: Clock },
  { id: 'export', label: 'Export Center', icon: Download },
  { id: 'widgets', label: 'Dashboard Widgets', icon: LayoutGrid },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('builder');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Export</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build custom reports, manage scheduled exports, and configure dashboard widgets
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white text-[#5B2D8E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'builder' && <ReportBuilder />}
      {activeTab === 'scheduled' && <ScheduledReports />}
      {activeTab === 'export' && <ExportCenter />}
      {activeTab === 'widgets' && <DashboardWidgets />}
    </div>
  );
}
