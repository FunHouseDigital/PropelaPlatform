import { useState } from 'react';
import { Server, Webhook, Puzzle, RefreshCw } from 'lucide-react';
import ApiEndpointSimulator from '../components/integrations/ApiEndpointSimulator';
import ApiKeyManager from '../components/integrations/ApiKeyManager';
import WebhookConfig from '../components/integrations/WebhookConfig';
import WebhookDeliveryLog from '../components/integrations/WebhookDeliveryLog';
import IntegrationCards from '../components/integrations/IntegrationCards';
import DataSyncDashboard from '../components/integrations/DataSyncDashboard';

const TABS = [
  { id: 'api-endpoints', label: 'API Endpoints', icon: Server },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'data-sync', label: 'Data Sync', icon: RefreshCw },
];

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('api-endpoints');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations &amp; API</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage API endpoints, webhooks, third-party integrations, and data synchronization
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
      {activeTab === 'api-endpoints' && (
        <div className="space-y-8">
          <ApiEndpointSimulator />
          <ApiKeyManager />
        </div>
      )}
      {activeTab === 'webhooks' && (
        <div className="space-y-8">
          <WebhookConfig />
          <WebhookDeliveryLog />
        </div>
      )}
      {activeTab === 'integrations' && (
        <IntegrationCards />
      )}
      {activeTab === 'data-sync' && (
        <DataSyncDashboard />
      )}
    </div>
  );
}
