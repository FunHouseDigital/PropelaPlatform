import { useState, useMemo } from 'react';
import { Filter, RotateCcw, X, Plus, Edit, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const CHANGE_TYPE_BADGES = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  rollback_requested: 'bg-orange-100 text-orange-700',
};

const CHANGE_TYPE_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  rollback_requested: RotateCcw,
};

export default function ChangeHistoryViewer() {
  const { changeHistory, updateChangeHistory } = useAppContext();
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [entityNameFilter, setEntityNameFilter] = useState('');
  const [rollbackModal, setRollbackModal] = useState(null);

  const uniqueEntityTypes = useMemo(() => {
    const types = [...new Set(changeHistory.map((e) => e.entityType))];
    return types.sort();
  }, [changeHistory]);

  const filteredHistory = useMemo(() => {
    let entries = [...changeHistory];

    if (entityTypeFilter !== 'all') {
      entries = entries.filter((e) => e.entityType === entityTypeFilter);
    }
    if (entityNameFilter.trim()) {
      const query = entityNameFilter.toLowerCase();
      entries = entries.filter((e) => e.entityName.toLowerCase().includes(query));
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries;
  }, [changeHistory, entityTypeFilter, entityNameFilter]);

  const handleRollback = (entry) => {
    setRollbackModal(entry);
  };

  const confirmRollback = () => {
    if (!rollbackModal) return;

    const newEntry = {
      id: `ch-rb-${Date.now()}`,
      entityType: rollbackModal.entityType,
      entityId: rollbackModal.entityId,
      entityName: rollbackModal.entityName,
      timestamp: new Date().toISOString(),
      user: 'Current User',
      changes: rollbackModal.changes.map((c) => ({
        field: c.field,
        oldValue: c.newValue,
        newValue: c.oldValue,
      })),
      changeType: 'rollback_requested',
    };

    updateChangeHistory((prev) => [newEntry, ...prev]);
    setRollbackModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="flex gap-3">
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All Entity Types</option>
            {uniqueEntityTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={entityNameFilter}
            onChange={(e) => setEntityNameFilter(e.target.value)}
            placeholder="Search by entity name..."
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 flex-1 max-w-sm"
          />
        </div>
      </div>

      {/* Change History Entries */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No change history entries match the current filters.
          </div>
        ) : (
          filteredHistory.map((entry) => {
            const TypeIcon = CHANGE_TYPE_ICONS[entry.changeType] || Edit;
            return (
              <div
                key={entry.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        CHANGE_TYPE_BADGES[entry.changeType] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <TypeIcon size={12} />
                      {entry.changeType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{entry.entityName}</span>
                    <span className="text-xs text-gray-400 capitalize">{entry.entityType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()} by {entry.user}
                    </span>
                    {entry.changeType !== 'rollback_requested' && (
                      <button
                        onClick={() => handleRollback(entry)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Rollback
                      </button>
                    )}
                  </div>
                </div>

                {/* Diff Table */}
                <div className="px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase">
                        <th className="text-left pb-2 font-medium">Field</th>
                        <th className="text-left pb-2 font-medium">Old Value</th>
                        <th className="text-left pb-2 font-medium">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {entry.changes.map((change, idx) => (
                        <tr key={idx}>
                          <td className="py-2 text-gray-700 font-medium">{change.field}</td>
                          <td className="py-2">
                            <span className="text-red-600 line-through bg-red-50 px-1.5 py-0.5 rounded text-xs">
                              {change.oldValue || '(empty)'}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs font-medium">
                              {change.newValue || '(empty)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rollback Confirmation Modal */}
      {rollbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Rollback</h3>
              <button
                onClick={() => setRollbackModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to rollback this change? This will create a new change history
                entry of type &quot;rollback_requested&quot; for <strong>{rollbackModal.entityName}</strong>.
              </p>
              <div className="mt-3 bg-gray-50 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">Changes to revert:</div>
                {rollbackModal.changes.map((change, idx) => (
                  <div key={idx} className="text-xs text-gray-700">
                    {change.field}: {change.newValue} → {change.oldValue}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setRollbackModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRollback}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
