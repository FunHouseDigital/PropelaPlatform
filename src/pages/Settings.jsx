import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, GitBranch, Users, Puzzle, Bell, Eye } from 'lucide-react';
import OrganizationSettings from '../components/settings/OrganizationSettings';
import PipelineConfiguration from '../components/settings/PipelineConfiguration';
import UserManagement from '../components/settings/UserManagement';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import NotificationPreferences from '../components/settings/NotificationPreferences';
import AccessibilitySettings from '../components/settings/AccessibilitySettings';

const TABS = [
  { id: 'organization', labelKey: 'settings.tabs.organization', icon: Building2 },
  { id: 'pipeline', labelKey: 'settings.tabs.pipeline', icon: GitBranch },
  { id: 'users', labelKey: 'settings.tabs.users', icon: Users },
  { id: 'integrations', labelKey: 'settings.tabs.integrations', icon: Puzzle },
  { id: 'notifications', labelKey: 'settings.tabs.notifications', icon: Bell },
  { id: 'accessibility', labelKey: 'settings.tabs.accessibility', icon: Eye },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('organization');
  const { t } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('settings.description')}
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
              <span>{t(tab.labelKey)}</span>
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
      {activeTab === 'accessibility' && <AccessibilitySettings />}
    </div>
  );
}
