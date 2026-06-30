import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useExport } from '../../hooks/useExport';
import { generateApiKey } from '../../lib/secureRandom';
import { toCsv } from '../../lib/csv';
import { sanitizeText, validateUrl, MAX_LENGTHS } from '../../lib/validation';
import { Key, Webhook, Link2, Upload, Download, Save, Plus, Send, Lock } from 'lucide-react';

const EXPORT_MODULE = 'Settings';

const WEBHOOK_EVENTS = [
  'nurse.created',
  'nurse.updated',
  'stage.changed',
  'placement.assigned',
  'document.uploaded',
  'cohort.completed',
];

export default function IntegrationSettings() {
  const { settings, updateSettings } = useAppContext();
  const { runExport, canExport } = useExport();
  const canExportData = canExport(EXPORT_MODULE);
  const [apiKeys, setApiKeys] = useState([...settings.apiKeys]);
  const [webhooks, setWebhooks] = useState({ ...settings.webhooks });
  const [integrations, setIntegrations] = useState([...settings.integrations]);
  const [saved, setSaved] = useState(false);
  const [webhookTested, setWebhookTested] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [transferError, setTransferError] = useState('');
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef(null);

  const handleGenerateKey = () => {
    const newKey = {
      id: `key-${Date.now()}`,
      name: `API Key ${apiKeys.length + 1}`,
      key: generateApiKey(),
      createdDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    setApiKeys((prev) => [...prev, newKey]);
  };

  const handleRevokeKey = (id) => {
    setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'Revoked' } : k)));
  };

  const handleWebhookChange = (field, value) => {
    setWebhooks((prev) => ({ ...prev, [field]: value }));
  };

  const handleWebhookEventToggle = (event) => {
    setWebhooks((prev) => {
      const events = prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event];
      return { ...prev, events };
    });
  };

  const handleTestWebhook = () => {
    setWebhookTested(true);
    setTimeout(() => setWebhookTested(false), 3000);
  };

  const handleToggleIntegration = (id) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' } : i
      )
    );
  };

  const handleImportClick = () => {
    // Defense in depth + UX: don't even open the file picker without permission.
    if (!canExportData) {
      runExport({
        module: EXPORT_MODULE,
        entityType: 'users',
        format: 'CSV',
        verb: 'import',
      });
      setTransferError("You don't have permission to import data.");
      return;
    }
    setTransferError('');
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    // Reset input early so the same file can be selected again.
    e.target.value = '';
    if (!file) return;

    // Handler-level enforcement: even a force-called select cannot bypass this.
    const { allowed, error } = runExport(
      {
        module: EXPORT_MODULE,
        entityType: 'users',
        format: 'CSV',
        verb: 'import',
      },
      () => {
        setImportMessage('File imported successfully');
        setTimeout(() => setImportMessage(''), 3000);
      }
    );
    setTransferError(allowed ? '' : error);
  };

  const handleExport = () => {
    const users = settings.users || [];
    const headers = ['Name', 'Email', 'Role', 'Status'];
    // Build via the shared util (formula-injection + RFC-4180 safe). Names are
    // user-controlled, so this is a real injection surface.
    const csvContent = toCsv(
      users.map((u) => [u.name, u.email, u.role, u.status]),
      { headers }
    );

    // Gate + audit the export of user records behind the Settings permission.
    const { allowed, error } = runExport(
      {
        module: EXPORT_MODULE,
        entityType: 'users',
        format: 'CSV',
        recordCount: users.length,
      },
      () => {
        // Use a Blob download (consistent with the other exporters) instead of
        // a `data:` URI: it avoids encodeURI quirks and keeps the escaped CSV
        // content byte-for-byte intact.
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'propela_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    );
    setTransferError(allowed ? '' : error);
  };

  const handleSave = () => {
    // The webhook endpoint must use http/https when set (the type="url"
    // attribute alone would accept javascript:/data:/file:). Sanitize the URL
    // before persisting.
    const cleanUrl = sanitizeText(webhooks.url, { maxLength: MAX_LENGTHS.URL });
    if (cleanUrl && !validateUrl(cleanUrl, { protocols: ['http', 'https'] })) {
      setSaveError('Webhook endpoint URL must use http:// or https://.');
      return;
    }
    setSaveError('');
    const cleanWebhooks = { ...webhooks, url: cleanUrl };
    setWebhooks(cleanWebhooks);
    const updated = { ...settings, apiKeys, webhooks: cleanWebhooks, integrations };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const maskKey = (key) => {
    if (!key) return '';
    return key.slice(0, 8) + '••••••••••••';
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-[#5B2D8E]" />
            <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          </div>
          <button
            onClick={handleGenerateKey}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B2D8E]/10 text-[#5B2D8E] rounded-lg text-sm font-medium hover:bg-[#5B2D8E]/20 transition-colors"
          >
            <Plus size={14} />
            Generate Key
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Name</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Key</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Created</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Status</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-3 font-medium text-gray-900">{key.name}</td>
                  <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">{maskKey(key.key)}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{key.createdDate}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      key.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {key.status === 'Active' && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook size={18} className="text-[#5B2D8E]" />
          <h3 className="text-lg font-semibold text-gray-900">Webhook Configuration</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
            <input
              type="url"
              value={webhooks.url}
              onChange={(e) => handleWebhookChange('url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret</label>
            <input
              type="password"
              value={webhooks.secret}
              onChange={(e) => handleWebhookChange('secret', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={webhooks.events.includes(event)}
                    onChange={() => handleWebhookEventToggle(event)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#5B2D8E] focus:ring-[#5B2D8E]"
                  />
                  <span className="text-gray-700">{event}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={handleTestWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Send size={14} />
            {webhookTested ? 'Test Sent!' : 'Test Webhook'}
          </button>
        </div>
      </div>

      {/* Third-party Integrations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-[#5B2D8E]" />
          <h3 className="text-lg font-semibold text-gray-900">Third-party Integrations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{integration.name}</h4>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
              <p className="text-xs text-gray-500 mb-3">{integration.description}</p>
              <button
                onClick={() => handleToggleIntegration(integration.id)}
                className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  integration.status === 'connected'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Import/Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Import / Export</h3>
        {!canExportData && (
          <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <Lock size={12} />
            You don&apos;t have permission to import or export data.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Import Data</h4>
            <div
              onClick={handleImportClick}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                canExportData
                  ? 'border-gray-300 hover:border-[#5B2D8E]/40 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              {importMessage ? (
                <p className="text-sm text-green-600 font-medium">{importMessage}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports .csv and .xlsx formats</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Export Data</h4>
            <p className="text-xs text-gray-500 mb-3">Download all data as CSV</p>
            {canExportData ? (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed"
                title="You don't have permission to export this data"
              >
                <Lock size={14} />
                Export CSV
              </span>
            )}
          </div>
        </div>
        {transferError && (
          <p role="alert" className="text-sm text-red-600 font-medium mt-4">{transferError}</p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex flex-col items-end gap-2">
        {saveError && (
          <p role="alert" className="text-sm text-red-600">{saveError}</p>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
