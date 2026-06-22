import { useState, useCallback, useMemo } from 'react';
import { Plus, GripVertical, Edit2, Trash2, X, Activity, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../../context/AppContext';

const CONDITION_FIELDS = [
  { value: 'nurse.status', label: 'Nurse Status' },
  { value: 'nurse.priority_score', label: 'Nurse Priority Score' },
  { value: 'document.expiry_date', label: 'Document Expiry Date' },
  { value: 'placement.response_time', label: 'Placement Response Time' },
  { value: 'nurse.certifications_complete', label: 'Certifications Complete' },
  { value: 'facility.capacity_percentage', label: 'Facility Capacity' },
  { value: 'nurse.registration_date', label: 'Registration Date' },
  { value: 'placement.interview_result', label: 'Interview Result' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'days_before', label: 'Days Before' },
  { value: 'days_after', label: 'Days After' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'add_to_cohort', label: 'Add to Cohort' },
  { value: 'trigger_alert', label: 'Trigger Alert' },
];

function SortableRuleCard({ rule, onToggle, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const successRate = rule.triggerCount > 0
    ? Math.round((rule.successCount / rule.triggerCount) * 100)
    : 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
      <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
        <GripVertical size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{rule.name}</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">P{rule.priority}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(rule)} className="p-1 text-gray-400 hover:text-[#5B2D8E] transition-colors" title="Edit rule">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(rule.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete rule">
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => onToggle(rule.id)}
              className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'}`}
              title={rule.enabled ? 'Disable rule' : 'Enable rule'}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2 truncate">{rule.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Activity size={12} /> Triggered: {rule.triggerCount}</span>
          <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> Success: {successRate}%</span>
          <span className="flex items-center gap-1"><Zap size={12} /> Actions: {rule.actions.length}</span>
        </div>
      </div>
    </div>
  );
}

function RuleEditorModal({ rule, onSave, onCancel }) {
  const isNew = !rule;
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [conditions, setConditions] = useState(
    rule?.conditions?.length > 0
      ? rule.conditions
      : [{ logic: 'AND', conditions: [{ field: 'nurse.status', operator: 'equals', value: '' }] }]
  );
  const [actions, setActions] = useState(
    rule?.actions?.length > 0
      ? rule.actions
      : [{ type: 'send_email', params: {} }]
  );

  const handleAddConditionGroup = () => {
    setConditions([...conditions, { logic: 'AND', conditions: [{ field: 'nurse.status', operator: 'equals', value: '' }] }]);
  };

  const handleRemoveConditionGroup = (groupIndex) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((_, i) => i !== groupIndex));
  };

  const handleToggleGroupLogic = (groupIndex) => {
    setConditions(conditions.map((g, i) => i === groupIndex ? { ...g, logic: g.logic === 'AND' ? 'OR' : 'AND' } : g));
  };

  const handleAddCondition = (groupIndex) => {
    setConditions(conditions.map((g, i) => i === groupIndex ? { ...g, conditions: [...g.conditions, { field: 'nurse.status', operator: 'equals', value: '' }] } : g));
  };

  const handleRemoveCondition = (groupIndex, condIndex) => {
    setConditions(conditions.map((g, i) => {
      if (i !== groupIndex) return g;
      if (g.conditions.length <= 1) return g;
      return { ...g, conditions: g.conditions.filter((_, ci) => ci !== condIndex) };
    }));
  };

  const handleConditionChange = (groupIndex, condIndex, field, value) => {
    setConditions(conditions.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return { ...g, conditions: g.conditions.map((c, ci) => ci === condIndex ? { ...c, [field]: value } : c) };
    }));
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'send_email', params: {} }]);
  };

  const handleRemoveAction = (index) => {
    if (actions.length <= 1) return;
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index, type) => {
    setActions(actions.map((a, i) => i === index ? { type, params: {} } : a));
  };

  const handleActionParamChange = (index, key, value) => {
    setActions(actions.map((a, i) => i === index ? { ...a, params: { ...a.params, [key]: value } } : a));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), conditions, actions });
  };

  const getActionParamFields = (type) => {
    switch (type) {
      case 'send_email': return [{ key: 'template', label: 'Email Template', placeholder: 'e.g. template-1' }, { key: 'recipient', label: 'Recipient', placeholder: 'e.g. nurse.email' }];
      case 'update_status': return [{ key: 'newStatus', label: 'New Status', placeholder: 'e.g. active, pending_review' }];
      case 'create_task': return [{ key: 'title', label: 'Task Title', placeholder: 'e.g. Follow up with nurse' }, { key: 'assignee', label: 'Assignee', placeholder: 'e.g. team_lead' }];
      case 'add_to_cohort': return [{ key: 'cohortId', label: 'Cohort ID', placeholder: 'e.g. cohort-1' }];
      case 'trigger_alert': return [{ key: 'channel', label: 'Channel', placeholder: 'email, sms, in_app' }, { key: 'severity', label: 'Severity', placeholder: 'low, medium, high, critical' }];
      default: return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{isNew ? 'Create Rule' : 'Edit Rule'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Name and Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
                placeholder="Enter rule name..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none resize-none"
                rows={2}
                placeholder="Describe what this rule does..."
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Conditions</h3>
              <button onClick={handleAddConditionGroup} className="text-xs text-[#5B2D8E] hover:text-[#4a2573] font-medium flex items-center gap-1">
                <Plus size={12} /> Add Group
              </button>
            </div>
            <div className="space-y-3">
              {conditions.map((group, gi) => (
                <div key={gi} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    {gi > 0 && (
                      <button
                        onClick={() => handleToggleGroupLogic(gi)}
                        className={`text-xs font-bold px-2 py-0.5 rounded ${group.logic === 'AND' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}
                      >
                        {group.logic}
                      </button>
                    )}
                    {gi === 0 && <span className="text-xs text-gray-500 font-medium">IF</span>}
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleAddCondition(gi)} className="text-xs text-[#5B2D8E] hover:text-[#4a2573] font-medium">+ Condition</button>
                      {conditions.length > 1 && (
                        <button onClick={() => handleRemoveConditionGroup(gi)} className="text-xs text-red-500 hover:text-red-700 ml-2">Remove</button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.conditions.map((cond, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <select
                          value={cond.field}
                          onChange={(e) => handleConditionChange(gi, ci, 'field', e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                        >
                          {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) => handleConditionChange(gi, ci, 'operator', e.target.value)}
                          className="w-28 px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                        >
                          {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) => handleConditionChange(gi, ci, 'value', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs"
                          placeholder="Value"
                        />
                        {group.conditions.length > 1 && (
                          <button onClick={() => handleRemoveCondition(gi, ci)} className="text-red-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Actions</h3>
              <button onClick={handleAddAction} className="text-xs text-[#5B2D8E] hover:text-[#4a2573] font-medium flex items-center gap-1">
                <Plus size={12} /> Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actions.map((action, ai) => (
                <div key={ai} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={action.type}
                      onChange={(e) => handleActionTypeChange(ai, e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white font-medium"
                    >
                      {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {actions.length > 1 && (
                      <button onClick={() => handleRemoveAction(ai)} className="text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {getActionParamFields(action.type).map((param) => (
                      <div key={param.key}>
                        <label className="block text-xs text-gray-500 mb-0.5">{param.label}</label>
                        <input
                          type="text"
                          value={action.params[param.key] || ''}
                          onChange={(e) => handleActionParamChange(ai, param.key, e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                          placeholder={param.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-md hover:bg-[#4a2573] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNew ? 'Create Rule' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RuleBuilder() {
  const { automationRules, updateAutomationRules } = useAppContext();
  const [editorRule, setEditorRule] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedRules = useMemo(() => {
    return [...automationRules].sort((a, b) => a.priority - b.priority);
  }, [automationRules]);

  const stats = useMemo(() => {
    const totalRules = automationRules.length;
    const activeRules = automationRules.filter((r) => r.enabled).length;
    const totalExecutions = automationRules.reduce((sum, r) => sum + r.triggerCount, 0);
    const avgSuccessRate = totalRules > 0
      ? Math.round(automationRules.reduce((sum, r) => sum + (r.triggerCount > 0 ? (r.successCount / r.triggerCount) * 100 : 0), 0) / totalRules)
      : 0;
    return { totalRules, activeRules, totalExecutions, avgSuccessRate };
  }, [automationRules]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedRules.findIndex((r) => r.id === active.id);
    const newIndex = sortedRules.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(sortedRules, oldIndex, newIndex);
    const updated = reordered.map((rule, idx) => ({ ...rule, priority: idx + 1 }));
    updateAutomationRules(updated);
  }, [sortedRules, updateAutomationRules]);

  const handleToggle = useCallback((ruleId) => {
    const updated = automationRules.map((r) => r.id === ruleId ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r);
    updateAutomationRules(updated);
  }, [automationRules, updateAutomationRules]);

  const handleDelete = useCallback((ruleId) => {
    const updated = automationRules.filter((r) => r.id !== ruleId);
    updateAutomationRules(updated);
  }, [automationRules, updateAutomationRules]);

  const handleEdit = useCallback((rule) => {
    setEditorRule(rule);
    setShowEditor(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditorRule(null);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback((data) => {
    if (editorRule) {
      const updated = automationRules.map((r) =>
        r.id === editorRule.id
          ? { ...r, name: data.name, description: data.description, conditions: data.conditions, actions: data.actions, updatedAt: new Date().toISOString() }
          : r
      );
      updateAutomationRules(updated);
    } else {
      const maxPriority = automationRules.length > 0 ? Math.max(...automationRules.map((r) => r.priority)) : 0;
      const newRule = {
        id: `rule-${String(Date.now()).slice(-6)}`,
        name: data.name,
        description: data.description,
        enabled: true,
        priority: maxPriority + 1,
        conditions: data.conditions,
        actions: data.actions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
      };
      updateAutomationRules([...automationRules, newRule]);
    }
    setShowEditor(false);
    setEditorRule(null);
  }, [automationRules, updateAutomationRules, editorRule]);

  const handleCancelEditor = useCallback(() => {
    setShowEditor(false);
    setEditorRule(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Rules</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalRules}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Active Rules</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Executions</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Success Rate</p>
          <p className="text-2xl font-bold text-[#5B2D8E]">{stats.avgSuccessRate}%</p>
        </div>
      </div>

      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automation Rules</h2>
          <p className="text-sm text-gray-500">Drag to reorder priority. Higher position means higher priority.</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white text-sm font-medium rounded-md hover:bg-[#4a2573] transition-colors"
        >
          <Plus size={16} /> Create Rule
        </button>
      </div>

      {/* Rule List with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedRules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sortedRules.map((rule) => (
              <SortableRuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sortedRules.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No automation rules configured yet.</p>
          <button onClick={handleCreate} className="mt-3 text-sm text-[#5B2D8E] hover:text-[#4a2573] font-medium">
            Create your first rule
          </button>
        </div>
      )}

      {/* Rule Editor Modal */}
      {showEditor && (
        <RuleEditorModal rule={editorRule} onSave={handleSave} onCancel={handleCancelEditor} />
      )}
    </div>
  );
}
