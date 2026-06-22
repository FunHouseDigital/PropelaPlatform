import { useState } from 'react';
import { TrendingUp, GitCompareArrows, Activity, FileText } from 'lucide-react';
import ExecutiveSummary from '../components/analytics/ExecutiveSummary';
import CohortComparison from '../components/analytics/CohortComparison';
import PipelineAnalytics from '../components/analytics/PipelineAnalytics';
import ReportBuilder from '../components/analytics/ReportBuilder';

const TABS = [
  { id: 'executive', label: 'Executive Summary', icon: TrendingUp },
  { id: 'cohorts', label: 'Cohort Comparison', icon: GitCompareArrows },
  { id: 'pipeline', label: 'Pipeline Analytics', icon: Activity },
  { id: 'reports', label: 'Report Builder', icon: FileText },
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('executive');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track performance metrics, compare cohorts, and generate reports
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
      {activeTab === 'executive' && <ExecutiveSummary />}
      {activeTab === 'cohorts' && <CohortComparison />}
      {activeTab === 'pipeline' && <PipelineAnalytics />}
      {activeTab === 'reports' && <ReportBuilder />}
    </div>
  );
}
