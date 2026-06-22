import { useState, useCallback } from 'react';
import { Puzzle, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SYNC_FREQUENCY_OPTIONS = [
  { value: 'every_5_minutes', label: 'Every 5 minutes' },
  { value: 'every_15_minutes', label: 'Every 15 minutes' },
  { value: 'every_30_minutes', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Every 1 hour' },
  { value: 'every_6_hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Every 24 hours' },
];

const STATUS_CONFIG = {
  connected: { color: 'bg-green-500', label: 'Connected', textColor: 'text-green-700' },
  syncing: { color: 'bg-yellow-500', label: 'Syncing', textColor: 'text-yellow-700' },
  error: { color: 'bg-red-500', label: 'Error', textColor: 'text-red-700' },
  disconnected: { color: 'bg-gray-400', label: 'Disconnected', textColor: 'text-gray-500' },
};

const PROVIDER_COLORS = {
  'int-001': 'bg-blue-100 text-blue-700',
  'int-002': 'bg-purple-100 text-purple-700',
  'int-003': 'bg-orange-100 text-orange-700',
  'int-004': 'bg-teal-100 text-teal-700',
};

const SYNC_STATUS_ICONS = {
  success: { icon: CheckCircle, color: 'text-green-600' },
  in_progress: { icon: RefreshCw, color: 'text-yellow-600' },
  failed: { icon: XCircle, color: 'text-red-600' },
};

function formatTimestamp(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function IntegrationCards() {
  const { integrations, updateIntegrations } = useAppContext();
  const [expandedCard, setExpandedCard] = useState(null);
  const [editState, setEditState] = useState({});
  const [showApiKey, setShowApiKey] = useState(false);

  const toggleExpand = useCallback((id) => {
    setExpandedCard((prev) => {
      if (prev === id) return null;
      const integration = integrations.find((i) => i.id === id);
      if (integration) {
        setEditState({
          apiKey: integration.apiKey || '',
          syncFrequency: integration.syncFrequency || 'hourly',
          enabled: integration.status === 'connected' || integration.status === 'syncing',
        });
      }
      setShowApiKey(false);
      return id;
    });
  }, [integrations]);

  const handleConnect = useCallback((integrationId) => {
    const updated = integrations.map((i) => {
      if (i.id === integrationId) {
        const newStatus = i.status === 'connected' || i.status === 'syncing' ? 'disconnected' : 'connected';
        return { ...i, status: newStatus };
      }
      return i;
    });
    updateIntegrations(updated);
  }, [integrations, updateIntegrations]);

  const handleSaveConfig = useCallback((integrationId) => {
    const updated = integrations.map((i) => {
      if (i.id === integrationId) {
        return {
          ...i,
          apiKey: editState.apiKey,
          syncFrequency: editState.syncFrequency,
          status: editState.enabled ? 'connected' : 'disconnected',
        };
      }
      return i;
    });
    updateIntegrations(updated);
  }, [integrations, updateIntegrations, editState]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Third-Party Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">Connect and manage external service integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const statusConf = STATUS_CONFIG[integration.status] || STATUS_CONFIG.disconnected;
          const isExpanded = expandedCard === integration.id;
          const providerColor = PROVIDER_COLORS[integration.id] || 'bg-gray-100 text-gray-700';

          return (
            <div
              key={integration.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(integration.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${providerColor}`}>
                      <Puzzle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-xs text-gray-500">{integration.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusConf.color}`} />
                      <span className={`text-xs font-medium ${statusConf.textColor}`}>{statusConf.label}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Last sync: {formatTimestamp(integration.lastSync)}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw size={12} />
                    {SYNC_FREQUENCY_OPTIONS.find((o) => o.value === integration.syncFrequency)?.label || integration.syncFrequency}
                  </span>
                </div>
              </div>

              {/* Connect/Disconnect Button */}
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); handleConnect(integration.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    integration.status === 'connected' || integration.status === 'syncing'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {integration.status === 'connected' || integration.status === 'syncing' ? (
                    <><WifiOff size={12} /> Disconnect</>
                  ) : (
                    <><Wifi size={12} /> Connect</>
                  )}
                </button>
              </div>

              {/* Expanded Config Panel */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                  {/* Configuration */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Configuration</h4>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={editState.apiKey || ''}
                          onChange={(e) => setEditState((s) => ({ ...s, apiKey: e.target.value }))}
                          className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-md text-xs font-mono bg-white focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
                          placeholder="Enter API key..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title={showApiKey ? 'Hide API key' : 'Reveal API key'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sync Frequency</label>
                      <select
                        value={editState.syncFrequency || 'hourly'}
                        onChange={(e) => setEditState((s) => ({ ...s, syncFrequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs bg-white focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
                      >
                        {SYNC_FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">Enabled</label>
                      <button
                        onClick={() => setEditState((s) => ({ ...s, enabled: !s.enabled }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          editState.enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            editState.enabled ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      onClick={() => handleSaveConfig(integration.id)}
                      className="w-full py-2 bg-[#5B2D8E] text-white text-xs font-medium rounded-md hover:bg-[#4a2573] transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>

                  {/* Sync History */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sync History</h4>
                    {integration.syncHistory && integration.syncHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Timestamp</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Records</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Status</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {integration.syncHistory.map((entry, idx) => {
                              const syncConf = SYNC_STATUS_ICONS[entry.status] || SYNC_STATUS_ICONS.success;
                              const StatusIcon = syncConf.icon;
                              return (
                                <tr key={idx} className="border-b border-gray-100">
                                  <td className="py-2 px-2 text-gray-700">{formatTimestamp(entry.timestamp)}</td>
                                  <td className="py-2 px-2 text-gray-700">{entry.recordsSynced}</td>
                                  <td className="py-2 px-2">
                                    <span className={`inline-flex items-center gap-1 ${syncConf.color}`}>
                                      <StatusIcon size={12} />
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-gray-700">{entry.errors}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No sync history available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
