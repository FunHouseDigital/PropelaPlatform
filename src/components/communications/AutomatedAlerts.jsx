import { useState, useMemo } from 'react';
import { AlertTriangle, Plus, ToggleLeft, ToggleRight, Clock, Trash2, Edit2, X, History } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const TRIGGER_OPTIONS = [
  { value: 'document_expiry', label: 'Document Expiry Warning', field: 'days_before', fieldLabel: 'Days Before Expiry', unit: 'days' },
  { value: 'compliance_drop', label: 'Compliance Score Drop', field: 'threshold_percent', fieldLabel: 'Threshold Percentage', unit: '%' },
  { value: 'verification_overdue', label: 'Verification Overdue', field: 'days_overdue', fieldLabel: 'Days Overdue', unit: 'days' },
  { value: 'pipeline_stagnant', label: 'Pipeline Stage Stagnant', field: 'days_inactive', fieldLabel: 'Days Inactive', unit: 'days' },
  { value: 'placement_pending', label: 'Placement Pending Response', field: 'days_waiting', fieldLabel: 'Days Waiting', unit: 'days' },
  { value: 'training_missed', label: 'Training Session Missed', field: 'sessions_missed', fieldLabel: 'Sessions Missed', unit: 'sessions' },
];

const TRIGGER_COLORS = {
  document_expiry: 'bg-amber-100 text-amber-700',
  compliance_drop: 'bg-red-100 text-red-700',
  verification_overdue: 'bg-orange-100 text-orange-700',
  pipeline_stagnant: 'bg-blue-100 text-blue-700',
  placement_pending: 'bg-green-100 text-green-700',
  training_missed: 'bg-purple-100 text-purple-700',
};

export default function AutomatedAlerts() {
  const { alertRules, alertHistory, nurses, updateAlertRules, updateAlertHistory } = useAppContext();
  const [activeView, setActiveView] = useState('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    trigger: 'document_expiry',
    value: 30,
    name: '',
    description: '',
  });

  const nurseMap = useMemo(() => {
    const map = {};
    nurses.forEach((n) => {
      map[n.id] = n.fullName;
    });
    return map;
  }, [nurses]);

  const sortedHistory = useMemo(() => {
    return [...alertHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [alertHistory]);

  function handleToggleRule(ruleId) {
    const updated = alertRules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    updateAlertRules(updated);
  }

  function handleCreateRule() {
    setRuleForm({ trigger: 'document_expiry', value: 30, name: '', description: '' });
    setEditingRule(null);
    setShowCreateModal(true);
  }

  function handleEditRule(rule) {
    setRuleForm({
      trigger: rule.trigger,
      value: rule.value,
      name: rule.name,
      description: rule.description,
    });
    setEditingRule(rule);
    setShowCreateModal(true);
  }

  function handleSaveRule() {
    const triggerOption = TRIGGER_OPTIONS.find((t) => t.value === ruleForm.trigger);
    if (!triggerOption) return;

    const name = ruleForm.name || triggerOption.label;
    const description = ruleForm.description || `Alert when ${triggerOption.label.toLowerCase()} threshold of ${ruleForm.value} ${triggerOption.unit} is reached`;

    if (editingRule) {
      const updated = alertRules.map((r) =>
        r.id === editingRule.id
          ? { ...r, trigger: ruleForm.trigger, value: ruleForm.value, field: triggerOption.field, name, description }
          : r
      );
      updateAlertRules(updated);
    } else {
      const newRule = {
        id: generateId('alert-rule'),
        name,
        trigger: ruleForm.trigger,
        field: triggerOption.field,
        value: ruleForm.value,
        enabled: true,
        createdAt: new Date().toISOString().split('T')[0],
        lastTriggered: null,
        triggerCount: 0,
        description,
      };
      updateAlertRules([...alertRules, newRule]);
    }
    setShowCreateModal(false);
  }

  function handleDeleteRule(ruleId) {
    const updated = alertRules.filter((r) => r.id !== ruleId);
    updateAlertRules(updated);
  }

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setActiveView('rules')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'rules'
              ? 'bg-[#5B2D8E]/10 text-[#5B2D8E]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertTriangle size={16} />
          Alert Rules ({alertRules.length})
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'history'
              ? 'bg-[#5B2D8E]/10 text-[#5B2D8E]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History size={16} />
          Alert History ({alertHistory.length})
        </button>

        {activeView === 'rules' && (
          <button
            onClick={handleCreateRule}
            className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2573] transition-colors ml-auto"
          >
            <Plus size={16} />
            New Rule
          </button>
        )}
      </div>

      {/* Rules View */}
      {activeView === 'rules' && (
        <div className="space-y-3">
          {alertRules.map((rule) => {
            const triggerColor = TRIGGER_COLORS[rule.trigger] || 'bg-gray-100 text-gray-700';
            const triggerOption = TRIGGER_OPTIONS.find((t) => t.value === rule.trigger);

            return (
              <div
                key={rule.id}
                className={`bg-white border rounded-lg p-4 transition-all ${
                  rule.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className="mt-0.5"
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight size={24} className="text-[#5B2D8E]" />
                    ) : (
                      <ToggleLeft size={24} className="text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${triggerColor}`}>
                        {triggerOption?.label || rule.trigger}
                      </span>
                      {rule.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">
                        Threshold: {rule.value} {triggerOption?.unit || ''}
                      </span>
                      <span className="text-xs text-gray-400">
                        Triggered: {rule.triggerCount} times
                      </span>
                      {rule.lastTriggered && (
                        <span className="text-xs text-gray-400">
                          Last: {new Date(rule.lastTriggered).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <Edit2 size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {alertRules.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-50" />
              <p>No alert rules configured</p>
              <p className="text-xs mt-1">Create a new rule to get started</p>
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="space-y-2">
          {sortedHistory.map((entry) => {
            const triggerColor = TRIGGER_COLORS[entry.trigger] || 'bg-gray-100 text-gray-700';

            return (
              <div
                key={entry.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 ${
                  entry.resolved ? '' : 'border-l-4 border-l-amber-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${triggerColor}`}>
                    <AlertTriangle size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.ruleName}</span>
                      {entry.resolved ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Resolved</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Open</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{entry.details}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {entry.nurseId && (
                        <span className="text-xs text-gray-400">
                          {nurseMap[entry.nurseId] || entry.nurseId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {alertHistory.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <History size={40} className="mx-auto mb-3 opacity-50" />
              <p>No alert history available</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Optional custom name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                <select
                  value={ruleForm.trigger}
                  onChange={(e) => {
                    const opt = TRIGGER_OPTIONS.find((t) => t.value === e.target.value);
                    setRuleForm({ ...ruleForm, trigger: e.target.value, value: opt ? 30 : ruleForm.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                >
                  {TRIGGER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {TRIGGER_OPTIONS.find((t) => t.value === ruleForm.trigger)?.fieldLabel || 'Threshold Value'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={ruleForm.value}
                    onChange={(e) => setRuleForm({ ...ruleForm, value: parseInt(e.target.value) || 0 })}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {TRIGGER_OPTIONS.find((t) => t.value === ruleForm.trigger)?.unit || ''}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Optional description of this alert rule"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#4a2573] transition-colors"
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
