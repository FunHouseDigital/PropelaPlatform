import { useState } from 'react';
import { Briefcase, Shuffle, BarChart3 } from 'lucide-react';
import PlacementPipelineBoard from '../components/placements/PlacementPipelineBoard';
import FacilityMatchingEngine from '../components/placements/FacilityMatchingEngine';
import OutcomesDashboard from '../components/placements/OutcomesDashboard';

const TABS = [
  { id: 'pipeline', label: 'Pipeline Board', icon: Briefcase },
  { id: 'matching', label: 'Matching Engine', icon: Shuffle },
  { id: 'outcomes', label: 'Outcomes Dashboard', icon: BarChart3 },
];

export default function PlacementTracker() {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Placement & Outcomes Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage nurse placements, match candidates to facilities, and track outcomes
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
      {activeTab === 'pipeline' && <PlacementPipelineBoard />}
      {activeTab === 'matching' && <FacilityMatchingEngine />}
      {activeTab === 'outcomes' && <OutcomesDashboard />}
    </div>
  );
}
