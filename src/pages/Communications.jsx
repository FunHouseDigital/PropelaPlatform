import { useState } from 'react';
import { MessageSquare, Bell, Mail, AlertTriangle } from 'lucide-react';
import CommunicationLog from '../components/communications/CommunicationLog';
import NotificationCenter from '../components/communications/NotificationCenter';
import EmailTemplates from '../components/communications/EmailTemplates';
import AutomatedAlerts from '../components/communications/AutomatedAlerts';

const TABS = [
  { id: 'log', label: 'Communication Log', icon: MessageSquare },
  { id: 'notifications', label: 'Notification Center', icon: Bell },
  { id: 'templates', label: 'Email Templates', icon: Mail },
  { id: 'alerts', label: 'Automated Alerts', icon: AlertTriangle },
];

export default function Communications() {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Communications &amp; Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track communications, manage notifications, email templates, and automated alerts
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
      {activeTab === 'log' && <CommunicationLog />}
      {activeTab === 'notifications' && <NotificationCenter />}
      {activeTab === 'templates' && <EmailTemplates />}
      {activeTab === 'alerts' && <AutomatedAlerts />}
    </div>
  );
}
