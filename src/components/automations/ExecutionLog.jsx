import { useState, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const STATUS_FILTERS = ['All', 'success', 'failure', 'skipped'];

function StatusBadge({ status }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    failure: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
  };
  const icons = {
    success: <CheckCircle size={10} />,
    failure: <XCircle size={10} />,
    skipped: <AlertTriangle size={10} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status]} {status}
    </span>
  );
}

function getDuration(triggeredAt, completedAt) {
  const start = new Date(triggeredAt);
  const end = new Date(completedAt);
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function ExecutionLog() {
  const { executionLog, updateExecutionLog } = useAppContext();
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);

  const filteredLog = useMemo(() => {
    let filtered = executionLog;
    if (statusFilter !== 'All') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }
    return [...filtered].sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
  }, [executionLog, statusFilter]);

  const stats = useMemo(() => {
    const total = executionLog.length;
    const successes = executionLog.filter((e) => e.status === 'success').length;
    const failures = executionLog.filter((e) => e.status === 'failure').length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 0;

    // Calculate average duration
    const durations = executionLog.map((e) => new Date(e.completedAt) - new Date(e.triggeredAt)).filter((d) => d > 0);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgDurationStr = avgDuration < 1000 ? `${avgDuration}ms` : `${(avgDuration / 1000).toFixed(1)}s`;

    return { total, successes, failures, successRate, avgDurationStr };
  }, [executionLog]);

  const handleRerun = useCallback((entry) => {
    const newEntry = {
      id: crypto.randomUUID(),
      ruleId: entry.ruleId,
      ruleName: entry.ruleName,
      triggeredAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 1500).toISOString(),
      status: 'success',
      triggerEvent: entry.triggerEvent,
      actionsExecuted: entry.actionsExecuted.map((a) => ({ ...a, status: 'completed' })),
      errorDetails: null,
      canRetry: false,
    };
    updateExecutionLog([newEntry, ...executionLog]);
  }, [executionLog, updateExecutionLog]);

  const toggleExpand = useCallback((id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Executions</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Failures</p>
          <p className="text-2xl font-bold text-red-600">{stats.failures}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-[#5B2D8E]">{stats.avgDurationStr}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                ${statusFilter === filter
                  ? 'bg-[#5B2D8E] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {filter}
              {filter !== 'All' && (
                <span className="ml-1.5 opacity-70">
                  ({executionLog.filter((e) => e.status === filter).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{filteredLog.length} entries</span>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Rule Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Triggered At</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLog.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedRow === entry.id}
                onToggleExpand={toggleExpand}
                onRerun={handleRerun}
              />
            ))}
          </tbody>
        </table>
        {filteredLog.length === 0 && (
          <div className="text-center py-12">
            <Activity size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No executions match the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ entry, isExpanded, onToggleExpand, onRerun }) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onToggleExpand(entry.id)}>
        <td className="px-3 py-3 text-gray-400">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-[200px]">{entry.ruleName}</td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(entry.triggeredAt).toLocaleString()}</td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{getDuration(entry.triggeredAt, entry.completedAt)}</td>
        <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
        <td className="px-4 py-3 text-gray-600">{entry.actionsExecuted.length} action{entry.actionsExecuted.length !== 1 ? 's' : ''}</td>
        <td className="px-4 py-3 text-right">
          {entry.canRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRerun(entry); }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5B2D8E] bg-purple-50 rounded hover:bg-purple-100 transition-colors"
              title="Re-run this execution"
            >
              <RefreshCw size={10} /> Re-run
            </button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Trigger Event:</span>
                  <p className="text-gray-900 font-medium mt-0.5">{entry.triggerEvent}</p>
                </div>
                <div>
                  <span className="text-gray-500">Rule ID:</span>
                  <p className="text-gray-900 font-medium mt-0.5">{entry.ruleId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Started:</span>
                  <p className="text-gray-900 font-medium mt-0.5">{new Date(entry.triggeredAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <p className="text-gray-900 font-medium mt-0.5">{new Date(entry.completedAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions Executed */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Actions Executed:</p>
                <div className="flex flex-wrap gap-2">
                  {entry.actionsExecuted.map((action, idx) => (
                    <span
                      key={idx}
                      className={`text-xs px-2 py-1 rounded border ${
                        action.status === 'completed'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {action.type} - {action.status}
                    </span>
                  ))}
                </div>
              </div>

              {/* Error Details */}
              {entry.errorDetails && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-xs font-medium text-red-800 mb-1">Error Details:</p>
                  <p className="text-xs text-red-700">{entry.errorDetails}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
