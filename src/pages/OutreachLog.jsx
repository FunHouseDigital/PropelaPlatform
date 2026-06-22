import { useState } from 'react';
import { Mail, FileText, BarChart3 } from 'lucide-react';
import OutreachTable from '../components/outreach/OutreachTable';
import TemplateLibrary from '../components/outreach/TemplateLibrary';
import ChannelPerformance from '../components/outreach/ChannelPerformance';

const TABS = [
  { id: 'log', label: 'Outreach Log', icon: Mail },
  { id: 'templates', label: 'Template Library', icon: FileText },
  { id: 'performance', label: 'Channel Performance', icon: BarChart3 },
];

export default function OutreachLog() {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Mail size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Outreach Log + Templates</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Aggregated outreach log across all acquisition tracks, reusable template library, and channel performance analytics.
      </p>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-propela-purple text-propela-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'log' && <OutreachTable />}
      {activeTab === 'templates' && <TemplateLibrary />}
      {activeTab === 'performance' && <ChannelPerformance />}
    </div>
  );
}
