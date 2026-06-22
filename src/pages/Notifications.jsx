import { useState } from 'react';
import { Bell, Settings, Play, History } from 'lucide-react';
import NotificationInbox from '../components/notifications/NotificationInbox';
import AlertConfiguration from '../components/notifications/AlertConfiguration';
import ToastNotifications from '../components/notifications/ToastNotifications';
import NotificationHistory from '../components/notifications/NotificationHistory';

const TABS = [
  { id: 'inbox', label: 'Notification Center', icon: Bell },
  { id: 'alert-config', label: 'Alert Configuration', icon: Settings },
  { id: 'toast-demo', label: 'Toast Demo', icon: Play },
  { id: 'history', label: 'Notification History', icon: History },
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('inbox');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage notifications, configure alert rules, and review notification history
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
      {activeTab === 'inbox' && <NotificationInbox />}
      {activeTab === 'alert-config' && <AlertConfiguration />}
      {activeTab === 'toast-demo' && <ToastNotifications />}
      {activeTab === 'history' && <NotificationHistory />}
    </div>
  );
}
