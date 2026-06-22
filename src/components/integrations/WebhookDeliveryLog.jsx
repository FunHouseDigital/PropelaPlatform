import { useState, useCallback } from 'react';
import { ListChecks, Eye, X, RefreshCw } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const STATUS_STYLES = {
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  retrying: 'bg-orange-100 text-orange-700',
};

function RetryBackoffVisualization({ attempts = 4 }) {
  const backoffTimes = Array.from({ length: attempts }, (_, i) => Math.pow(2, i));

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-md">
      <div className="text-xs font-medium text-gray-600 mb-2">Retry Backoff Timeline</div>
      <div className="flex items-end gap-1">
        {backoffTimes.map((time, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div
              className="bg-orange-400 rounded-sm w-6"
              style={{ height: `${(idx + 1) * 12}px` }}
            />
            <span className="text-[10px] text-gray-500">
              {time}s
            </span>
            <span className="text-[10px] text-gray-400">
              #{idx + 1}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-400">
        Exponential backoff: attempt 1: 1s, attempt 2: 2s, attempt 3: 4s, attempt 4: 8s
      </div>
    </div>
  );
}

export default function WebhookDeliveryLog() {
  const { webhookDeliveryLog } = useAppContext();
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showPayload, setShowPayload] = useState(false);

  const handleViewPayload = useCallback((delivery) => {
    setSelectedDelivery(delivery);
    setShowPayload(true);
  }, []);

  const handleClosePayload = useCallback(() => {
    setShowPayload(false);
    setSelectedDelivery(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ListChecks size={20} className="text-[#5B2D8E]" />
        <h2 className="text-lg font-semibold text-gray-900">Delivery Log</h2>
      </div>

      {/* Delivery Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Webhook ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Response Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {webhookDeliveryLog.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {delivery.timestamp ? new Date(delivery.timestamp).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    {delivery.event}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{delivery.webhookId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[delivery.status] || 'bg-gray-100 text-gray-600'}`}>
                    {delivery.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {delivery.responseCode ? (
                    <span className={`text-xs font-bold ${delivery.responseCode < 300 ? 'text-green-600' : 'text-red-600'}`}>
                      {delivery.responseCode}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleViewPayload(delivery)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Eye size={12} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Failed Deliveries - Retry Backoff */}
      {webhookDeliveryLog.some((d) => d.status === 'failed') && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={16} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-800">Retry Backoff Schedule</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Failed deliveries are retried with exponential backoff. Each subsequent attempt waits twice as long.
          </p>
          <RetryBackoffVisualization attempts={5} />
        </div>
      )}

      {/* Payload Preview Modal */}
      {showPayload && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#5B2D8E]" />
                <span className="text-sm font-medium text-gray-800">Payload Preview</span>
              </div>
              <button
                onClick={handleClosePayload}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-3 space-y-1">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Event:</span> {selectedDelivery.event}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Webhook:</span> {selectedDelivery.webhookId}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`inline-block px-1.5 py-0.5 rounded ${STATUS_STYLES[selectedDelivery.status]}`}>
                    {selectedDelivery.status}
                  </span>
                </div>
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Payload</div>
              <pre className="bg-gray-900 text-green-400 rounded-md p-3 text-xs overflow-x-auto">
                <code>{JSON.stringify(selectedDelivery.payload, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
