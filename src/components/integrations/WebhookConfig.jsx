import { useState, useCallback } from 'react';
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const AVAILABLE_EVENTS = [
  'nurse.created',
  'nurse.updated',
  'placement.created',
  'placement.updated',
  'document.uploaded',
  'document.verified',
  'communication.sent',
];

function generateSecret() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 24; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

export default function WebhookConfig() {
  const { webhooks, updateWebhooks } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [formSecret, setFormSecret] = useState(() => generateSecret());

  const handleAddWebhook = useCallback(() => {
    if (!formUrl.trim() || selectedEvents.length === 0) return;
    const newWebhook = {
      id: `wh-${Date.now()}`,
      url: formUrl.trim(),
      events: [...selectedEvents],
      secret: formSecret,
      status: 'active',
      createdAt: new Date().toISOString().split('.')[0],
    };
    updateWebhooks([...webhooks, newWebhook]);
    setFormUrl('');
    setSelectedEvents([]);
    setFormSecret(generateSecret());
    setShowForm(false);
  }, [webhooks, updateWebhooks, formUrl, selectedEvents, formSecret]);

  const handleDelete = useCallback((webhookId) => {
    updateWebhooks(webhooks.filter((w) => w.id !== webhookId));
  }, [webhooks, updateWebhooks]);

  const handleToggleStatus = useCallback((webhookId) => {
    const updated = webhooks.map((w) =>
      w.id === webhookId
        ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' }
        : w
    );
    updateWebhooks(updated);
  }, [webhooks, updateWebhooks]);

  const toggleEvent = useCallback((event) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }, []);

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    paused: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook size={20} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">Webhook Configuration</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#5B2D8E] text-white rounded-md text-sm font-medium hover:bg-[#4a2572] transition-colors"
        >
          <Plus size={14} />
          Register Webhook
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://your-service.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/30 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Types</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedEvents.includes(event)
                      ? 'bg-[#5B2D8E] text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Secret Key (auto-generated)</div>
            <code className="text-xs font-mono text-gray-700">{formSecret}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddWebhook}
              className="px-4 py-2 bg-[#5B2D8E] text-white rounded-md text-sm font-medium hover:bg-[#4a2572] transition-colors"
            >
              Register
            </button>
            <button
              onClick={() => { setShowForm(false); setFormUrl(''); setSelectedEvents([]); setFormSecret(generateSecret()); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      <div className="space-y-3">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[webhook.status] || 'bg-gray-100 text-gray-600'}`}>
                  {webhook.status}
                </span>
                <span className="text-sm font-mono text-gray-700 truncate max-w-md">{webhook.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(webhook.id)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  title={webhook.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  {webhook.status === 'active' ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {webhook.events.map((event) => (
                <span key={event} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                  {event}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Created: {webhook.createdAt ? new Date(webhook.createdAt).toLocaleDateString() : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
