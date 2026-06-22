import { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, ArrowRightLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SYNC_STATUS_BADGE = {
  success: { bg: 'bg-green-100', text: 'text-green-700', label: 'Success' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

function formatTimestamp(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Sample conflicts for demonstration
const SAMPLE_CONFLICTS = [
  { id: 'conf-001', integrationId: 'int-001', field: 'Employee Name', localValue: 'Sarah J. Williams', remoteValue: 'Sarah Jane Williams' },
  { id: 'conf-002', integrationId: 'int-002', field: 'Registration Number', localValue: 'NMC-2024-8891', remoteValue: 'NMC-2024-8892' },
  { id: 'conf-003', integrationId: 'int-003', field: 'DBS Certificate Date', localValue: '2025-01-15', remoteValue: '2025-01-14' },
  { id: 'conf-004', integrationId: 'int-004', field: 'Visa Expiry', localValue: '2026-03-20', remoteValue: '2026-03-21' },
];

export default function DataSyncDashboard() {
  const { integrations, syncStatus, updateSyncStatus } = useAppContext();
  const [syncProgress, setSyncProgress] = useState({});
  const [conflicts, setConflicts] = useState(SAMPLE_CONFLICTS);
  const [conflictResolutions, setConflictResolutions] = useState({});
  const mountedRef = useRef(true);
  const rAfIdRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rAfIdRef.current !== null) {
        cancelAnimationFrame(rAfIdRef.current);
        rAfIdRef.current = null;
      }
    };
  }, []);

  const handleManualSync = useCallback((integrationId) => {
    // Start sync animation
    setSyncProgress((prev) => ({ ...prev, [integrationId]: 0 }));

    // Animate progress from 0 to 100 over 2 seconds
    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setSyncProgress((prev) => ({ ...prev, [integrationId]: progress }));

      if (progress < 100) {
        rAfIdRef.current = requestAnimationFrame(animate);
      } else {
        rAfIdRef.current = null;
        // Mark sync complete
        setTimeout(() => {
          if (!mountedRef.current) return;
          setSyncProgress((prev) => {
            const next = { ...prev };
            delete next[integrationId];
            return next;
          });
          // Update sync status
          const updatedStatus = {
            ...syncStatus,
            [integrationId]: {
              ...syncStatus[integrationId],
              lastSync: new Date().toISOString(),
              status: 'success',
            },
          };
          updateSyncStatus(updatedStatus);
        }, 500);
      }
    };

    rAfIdRef.current = requestAnimationFrame(animate);
  }, [syncStatus, updateSyncStatus]);

  const handleResolutionSelect = useCallback((conflictId, choice) => {
    setConflictResolutions((prev) => ({ ...prev, [conflictId]: choice }));
  }, []);

  const handleResolveConflict = useCallback((conflictId) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    setConflictResolutions((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Sync Status Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Sync Dashboard</h2>
        <p className="text-sm text-gray-500 mb-4">Monitor synchronization status, resolve conflicts, and trigger manual syncs</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {integrations.map((integration) => {
            const status = syncStatus[integration.id] || {};
            const badge = SYNC_STATUS_BADGE[status.status] || SYNC_STATUS_BADGE.success;
            const isSyncing = syncProgress[integration.id] !== undefined;

            return (
              <div key={integration.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Last sync: {formatTimestamp(status.lastSync)}</span>
                  </div>
                  {status.conflicts > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle size={12} />
                      <span>{status.conflicts} conflict{status.conflicts > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Manual Sync Button / Progress */}
                <div className="mt-3">
                  {isSyncing ? (
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5B2D8E] rounded-full transition-all duration-100 ease-linear"
                          style={{ width: `${syncProgress[integration.id]}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#5B2D8E] font-medium text-center">
                        Syncing... {Math.round(syncProgress[integration.id])}%
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleManualSync(integration.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#5B2D8E]/10 text-[#5B2D8E] rounded-md text-xs font-medium hover:bg-[#5B2D8E]/20 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Sync Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Sync Summary Row */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync Timestamps Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {integrations.map((integration) => {
            const status = syncStatus[integration.id] || {};
            return (
              <div key={integration.id} className="flex items-center gap-2 text-xs">
                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                <span className="font-medium text-gray-700">{integration.name}:</span>
                <span className="text-gray-500">{formatTimestamp(status.lastSync)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflict Resolution */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft size={16} className="text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">Conflict Resolution</h3>
          {conflicts.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {conflicts.length} pending
            </span>
          )}
        </div>

        {conflicts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-gray-500">No conflicts to resolve</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict) => {
              const integration = integrations.find((i) => i.id === conflict.integrationId);
              const resolution = conflictResolutions[conflict.id];

              return (
                <div key={conflict.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium text-gray-900">{conflict.field}</span>
                      <span className="text-xs text-gray-400 ml-2">({integration?.name || 'Unknown'})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      resolution === 'local' ? 'border-[#5B2D8E] bg-[#5B2D8E]/5' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name={`conflict-${conflict.id}`}
                        checked={resolution === 'local'}
                        onChange={() => handleResolutionSelect(conflict.id, 'local')}
                        className="accent-[#5B2D8E]"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700">Local Value</p>
                        <p className="text-xs text-gray-500 font-mono">{conflict.localValue}</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      resolution === 'remote' ? 'border-[#5B2D8E] bg-[#5B2D8E]/5' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name={`conflict-${conflict.id}`}
                        checked={resolution === 'remote'}
                        onChange={() => handleResolutionSelect(conflict.id, 'remote')}
                        className="accent-[#5B2D8E]"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700">Remote Value</p>
                        <p className="text-xs text-gray-500 font-mono">{conflict.remoteValue}</p>
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={() => handleResolveConflict(conflict.id)}
                    disabled={!resolution}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      resolution
                        ? 'bg-[#5B2D8E] text-white hover:bg-[#4a2573]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Resolve
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
