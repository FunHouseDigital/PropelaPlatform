import { useState } from 'react';
import { Building2, GitBranch, Users, Puzzle, Bell } from 'lucide-react';
import OrganizationSettings from '../components/settings/OrganizationSettings';
import PipelineConfiguration from '../components/settings/PipelineConfiguration';
import UserManagement from '../components/settings/UserManagement';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import NotificationPreferences from '../components/settings/NotificationPreferences';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('organization');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings & Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage organization settings, pipeline, users, integrations, and notifications
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
      {activeTab === 'organization' && <OrganizationSettings />}
      {activeTab === 'pipeline' && <PipelineConfiguration />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'integrations' && <IntegrationSettings />}
      {activeTab === 'notifications' && <NotificationPreferences />}
    </div>
  );
}
