import { useState } from 'react';
import { Activity, FileText, Users, History } from 'lucide-react';

const TABS = [
  { id: 'activity-feed', label: 'Activity Feed', icon: Activity },
  { id: 'audit-log', label: 'Audit Log', icon: FileText },
  { id: 'user-sessions', label: 'User Sessions', icon: Users },
  { id: 'change-history', label: 'Change History', icon: History },
];

export default function AuditTrail() {
  const [activeTab, setActiveTab] = useState('activity-feed');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track activity, audit events, user sessions, and data change history
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
      {activeTab === 'activity-feed' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Activity Feed</h2>
          <p className="text-sm text-gray-500">Real-time feed of all system activities and user actions.</p>
        </div>
      )}
      {activeTab === 'audit-log' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Audit Log</h2>
          <p className="text-sm text-gray-500">Comprehensive log of all system events with severity levels.</p>
        </div>
      )}
      {activeTab === 'user-sessions' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">User Sessions</h2>
          <p className="text-sm text-gray-500">Monitor active user sessions and login activity.</p>
        </div>
      )}
      {activeTab === 'change-history' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Change History</h2>
          <p className="text-sm text-gray-500">Track all data modifications with before and after values.</p>
        </div>
      )}
    </div>
  );
}
