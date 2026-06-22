import { useState, useCallback } from 'react';
import { Key, Plus, Copy, Ban, Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

function generateUUID() {
  return 'pk_live_' + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function truncateKey(key) {
  if (!key || key.length < 16) return key;
  return key.substring(0, 12) + '...' + key.substring(key.length - 4);
}

export default function ApiKeyManager() {
  const { apiKeys, updateApiKeys } = useAppContext();
  const [copiedId, setCopiedId] = useState(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleGenerate = useCallback(() => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `key-${String(apiKeys.length + 1).padStart(3, '0')}`,
      name: newKeyName.trim(),
      key: generateUUID(),
      status: 'active',
      created: new Date().toISOString().split('.')[0],
      lastUsed: null,
    };
    updateApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    setShowGenerateForm(false);
  }, [apiKeys, updateApiKeys, newKeyName]);

  const handleRevoke = useCallback((keyId) => {
    const updated = apiKeys.map((k) =>
      k.id === keyId ? { ...k, status: 'revoked' } : k
    );
    updateApiKeys(updated);
  }, [apiKeys, updateApiKeys]);

  const handleCopy = useCallback((keyId, keyValue) => {
    navigator.clipboard.writeText(keyValue).catch(() => {
      // Fallback: do nothing if clipboard API not available
    });
    setCopiedId(keyId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-700',
    revoked: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={20} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">API Key Management</h2>
        </div>
        <button
          onClick={() => setShowGenerateForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#5B2D8E] text-white rounded-md text-sm font-medium hover:bg-[#4a2572] transition-colors"
        >
          <Plus size={14} />
          Generate Key
        </button>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Enter key name (e.g., Production API Key)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/30 focus:border-[#5B2D8E]"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-[#5B2D8E] text-white rounded-md text-sm font-medium hover:bg-[#4a2572] transition-colors"
            >
              Generate
            </button>
            <button
              onClick={() => { setShowGenerateForm(false); setNewKeyName(''); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{apiKey.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                    {truncateKey(apiKey.key)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[apiKey.status] || 'bg-gray-100 text-gray-700'}`}>
                    {apiKey.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {apiKey.created ? new Date(apiKey.created).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(apiKey.id, apiKey.key)}
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Copy key"
                    >
                      {copiedId === apiKey.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                    {apiKey.status === 'active' && (
                      <button
                        onClick={() => handleRevoke(apiKey.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                        title="Revoke key"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
