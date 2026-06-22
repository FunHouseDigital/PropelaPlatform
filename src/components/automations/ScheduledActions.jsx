import { useState, useMemo, useCallback } from 'react';
import { Plus, Calendar, List, Clock, Globe, X, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const CRON_PRESETS = [
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 6am', value: '0 6 * * 1' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
  { label: 'Every Friday at 5:30pm', value: '30 17 * * 5' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'First of every month', value: '0 0 1 * *' },
  { label: 'Custom', value: '' },
];

const TIMEZONES = ['Europe/London', 'America/New_York', 'Europe/Dublin', 'Asia/Kolkata'];

function cronToReadable(cron) {
  const map = {
    '0 9 * * 1-5': 'Every weekday at 9:00 AM',
    '0 8 * * *': 'Daily at 8:00 AM',
    '0 */4 * * *': 'Every 4 hours',
    '30 17 * * 5': 'Every Friday at 5:30 PM',
    '0 6 * * 1': 'Every Monday at 6:00 AM',
    '0 0 1 * *': 'First day of every month at midnight',
    '0 12 * * 3': 'Every Wednesday at noon',
    '0 7 * * *': 'Daily at 7:00 AM',
    '0 9 * * *': 'Daily at 9:00 AM',
  };
  return map[cron] || cron;
}

function getNext7Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

function ScheduledActionForm({ action, onSave, onCancel }) {
  const isNew = !action;
  const [ruleName, setRuleName] = useState(action?.ruleName || '');
  const [cronExpression, setCronExpression] = useState(action?.cronExpression || '0 9 * * *');
  const [selectedPreset, setSelectedPreset] = useState(
    CRON_PRESETS.find((p) => p.value === action?.cronExpression)?.label || 'Custom'
  );
  const [timezone, setTimezone] = useState(action?.timezone || 'Europe/London');
  const [batchSize, setBatchSize] = useState(action?.batchSize || 25);
  const [enabled, setEnabled] = useState(action?.enabled ?? true);

  const handlePresetChange = (presetLabel) => {
    setSelectedPreset(presetLabel);
    const preset = CRON_PRESETS.find((p) => p.label === presetLabel);
    if (preset && preset.value) {
      setCronExpression(preset.value);
    }
  };

  const handleSave = () => {
    if (!ruleName.trim()) return;
    onSave({
      ruleName: ruleName.trim(),
      cronExpression,
      timezone,
      batchSize: Number(batchSize),
      enabled,
      description: cronToReadable(cronExpression),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add Scheduled Action' : 'Edit Scheduled Action'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rule Name</label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
              placeholder="Enter rule name..."
            />
          </div>

          {/* Cron Expression Helper */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Schedule (Cron Preset)</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cron Expression</label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => { setCronExpression(e.target.value); setSelectedPreset('Custom'); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
              placeholder="e.g., 0 9 * * 1-5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: minute hour day-of-month month day-of-week
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Batch Size</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min={1}
                max={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">Enabled</label>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!ruleName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-md hover:bg-[#4a2573] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNew ? 'Add Schedule' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledActions() {
  const { scheduledActions, updateScheduledActions } = useAppContext();
  const [viewMode, setViewMode] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  const handleToggleEnabled = useCallback((actionId) => {
    const updated = scheduledActions.map((a) =>
      a.id === actionId ? { ...a, enabled: !a.enabled } : a
    );
    updateScheduledActions(updated);
  }, [scheduledActions, updateScheduledActions]);

  const handleEdit = useCallback((action) => {
    setEditingAction(action);
    setShowForm(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingAction(null);
    setShowForm(true);
  }, []);

  const handleSave = useCallback((data) => {
    if (editingAction) {
      const updated = scheduledActions.map((a) =>
        a.id === editingAction.id
          ? { ...a, ...data }
          : a
      );
      updateScheduledActions(updated);
    } else {
      const newAction = {
        id: `sched-${String(Date.now()).slice(-6)}`,
        ruleId: `rule-new-${String(Date.now()).slice(-4)}`,
        ...data,
        nextRunAt: new Date(Date.now() + 86400000).toISOString(),
        lastRunAt: null,
      };
      updateScheduledActions([...scheduledActions, newAction]);
    }
    setShowForm(false);
    setEditingAction(null);
  }, [scheduledActions, updateScheduledActions, editingAction]);

  const stats = useMemo(() => {
    const total = scheduledActions.length;
    const enabled = scheduledActions.filter((a) => a.enabled).length;
    return { total, enabled };
  }, [scheduledActions]);

  const next7Days = useMemo(() => getNext7Days(), []);

  const calendarData = useMemo(() => {
    return next7Days.map((day) => {
      const dayStr = day.toISOString().split('T')[0];
      const actions = scheduledActions.filter((a) => {
        if (!a.enabled) return false;
        const nextRun = a.nextRunAt ? a.nextRunAt.split('T')[0] : '';
        return nextRun === dayStr;
      });
      return { day, actions };
    });
  }, [next7Days, scheduledActions]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Schedules</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Enabled</p>
          <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Disabled</p>
          <p className="text-2xl font-bold text-gray-400">{stats.total - stats.enabled}</p>
        </div>
      </div>

      {/* View Toggle and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-[#5B2D8E] shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'calendar' ? 'bg-white text-[#5B2D8E] shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={14} /> Calendar
          </button>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white text-sm font-medium rounded-md hover:bg-[#4a2573] transition-colors"
        >
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {scheduledActions.map((action) => (
            <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleEnabled(action.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${action.enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'}`}
                    title={action.enabled ? 'Disable' : 'Enable'}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${action.enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <h3 className="font-medium text-gray-900">{action.ruleName}</h3>
                </div>
                <button
                  onClick={() => handleEdit(action)}
                  className="text-xs text-[#5B2D8E] hover:text-[#4a2573] font-medium"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">{action.cronExpression}</code>
                <span className="text-xs text-gray-500">{cronToReadable(action.cronExpression)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Globe size={12} />
                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{action.timezone}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Next: {action.nextRunAt ? new Date(action.nextRunAt).toLocaleString() : 'Not scheduled'}
                </span>
                {action.lastRunAt && (
                  <span className="text-gray-400">Last: {new Date(action.lastRunAt).toLocaleString()}</span>
                )}
                <span className="bg-gray-100 px-2 py-0.5 rounded">Batch: {action.batchSize}</span>
              </div>
            </div>
          ))}

          {scheduledActions.length === 0 && (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No scheduled actions configured yet.</p>
              <button onClick={handleAdd} className="mt-3 text-sm text-[#5B2D8E] hover:text-[#4a2573] font-medium">
                Add your first schedule
              </button>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Next 7 Days</h3>
            <p className="text-xs text-gray-500 mt-0.5">Scheduled actions for the upcoming week</p>
          </div>
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {calendarData.map(({ day, actions }) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={day.toISOString()} className="min-h-[140px]">
                  <div className={`px-2 py-2 text-center border-b border-gray-100 ${isToday ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <p className="text-xs font-medium text-gray-500">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? 'text-[#5B2D8E]' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {actions.map((action) => (
                      <div
                        key={action.id}
                        className="text-xs bg-purple-50 text-purple-700 px-1.5 py-1 rounded truncate"
                        title={action.ruleName}
                      >
                        {action.ruleName}
                      </div>
                    ))}
                    {actions.length === 0 && (
                      <p className="text-xs text-gray-300 text-center py-2">-</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All scheduled actions summary below calendar */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">All Scheduled Actions:</p>
            <div className="space-y-1.5">
              {scheduledActions.filter((a) => a.enabled).map((action) => (
                <div key={action.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{action.ruleName}</span>
                  <span className="text-gray-500">{cronToReadable(action.cronExpression)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <ScheduledActionForm
          action={editingAction}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingAction(null); }}
        />
      )}
    </div>
  );
}
