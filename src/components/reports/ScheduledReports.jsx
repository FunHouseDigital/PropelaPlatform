import { useState, useCallback, useMemo } from 'react';
import {
  Clock, Plus, Trash2, Play, Pause, Mail, X, Check, Calendar,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const REPORT_TYPES = [
  { value: 'nurse_pipeline_summary', label: 'Nurse Pipeline Summary' },
  { value: 'compliance_status', label: 'Compliance Status' },
  { value: 'placement_outcomes', label: 'Placement Outcomes' },
  { value: 'cohort_progress', label: 'Cohort Progress' },
  { value: 'communication_activity', label: 'Communication Activity' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMATS = ['PDF', 'CSV', 'On-screen'];

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getTypeLabel(type) {
  const found = REPORT_TYPES.find((rt) => rt.value === type);
  return found ? found.label : type;
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function ScheduledReports() {
  const { scheduledReports, updateScheduledReports } = useAppContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Form state for new schedule
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('nurse_pipeline_summary');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formRecipients, setFormRecipients] = useState([]);
  const [formRecipientInput, setFormRecipientInput] = useState('');
  const [formFormat, setFormFormat] = useState('CSV');

  const resetForm = useCallback(() => {
    setFormName('');
    setFormType('nurse_pipeline_summary');
    setFormFrequency('weekly');
    setFormRecipients([]);
    setFormRecipientInput('');
    setFormFormat('CSV');
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const handleAddRecipient = useCallback(() => {
    const email = formRecipientInput.trim();
    if (email && !formRecipients.includes(email)) {
      setFormRecipients((prev) => [...prev, email]);
      setFormRecipientInput('');
    }
  }, [formRecipientInput, formRecipients]);

  const handleRemoveRecipient = useCallback((email) => {
    setFormRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const handleCreateSchedule = useCallback(() => {
    if (!formName.trim()) return;

    const newSchedule = {
      id: `sched-report-${Date.now()}`,
      name: formName.trim(),
      type: formType,
      frequency: formFrequency,
      recipients: formRecipients,
      format: formFormat,
      lastRun: null,
      status: 'active',
      reportConfig: {
        dateRange: 'last_30_days',
        includeCharts: true,
        includeSummary: true,
        groupBy: 'stage',
      },
    };

    updateScheduledReports([...scheduledReports, newSchedule]);
    setShowCreateModal(false);
    resetForm();
  }, [formName, formType, formFrequency, formRecipients, formFormat, scheduledReports, updateScheduledReports, resetForm]);

  const handleToggleStatus = useCallback((scheduleId) => {
    const updated = scheduledReports.map((s) => {
      if (s.id === scheduleId) {
        return { ...s, status: s.status === 'active' ? 'paused' : 'active' };
      }
      return s;
    });
    updateScheduledReports(updated);
  }, [scheduledReports, updateScheduledReports]);

  const handleDelete = useCallback((scheduleId) => {
    const updated = scheduledReports.filter((s) => s.id !== scheduleId);
    updateScheduledReports(updated);
    if (selectedSchedule === scheduleId) {
      setSelectedSchedule(null);
    }
  }, [scheduledReports, updateScheduledReports, selectedSchedule]);

  // Build run history from all scheduled reports that have a lastRun
  const runHistory = useMemo(() => {
    return scheduledReports
      .filter((s) => s.lastRun)
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        lastRun: s.lastRun,
        status: s.status === 'active' ? 'success' : s.status === 'paused' ? 'pending' : 'failed',
        format: s.format,
      }))
      .sort((a, b) => new Date(b.lastRun) - new Date(a.lastRun));
  }, [scheduledReports]);

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] transition-colors"
        >
          <Plus size={16} />
          Create Schedule
        </button>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Active Schedules</h3>
        {scheduledReports.length === 0 ? (
          <p className="text-sm text-gray-400">No scheduled reports yet. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Report Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Frequency</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Last Run</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Recipients</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledReports.map((schedule, idx) => (
                  <tr
                    key={schedule.id}
                    className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 cursor-pointer transition-colors`}
                    onClick={() => setSelectedSchedule(selectedSchedule === schedule.id ? null : schedule.id)}
                  >
                    <td className="py-2 px-3 text-gray-900 text-xs font-medium">{schedule.name}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{getTypeLabel(schedule.type)}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs capitalize">{schedule.frequency}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{formatDate(schedule.lastRun)}</td>
                    <td className="py-2 px-3"><StatusBadge status={schedule.status} /></td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{schedule.recipients?.length || 0}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(schedule.id); }}
                          className="text-gray-400 hover:text-[#5B2D8E] transition-colors"
                          title={schedule.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {schedule.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected schedule details */}
      {selectedSchedule && (() => {
        const schedule = scheduledReports.find((s) => s.id === selectedSchedule);
        if (!schedule) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Schedule Details: {schedule.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Report Type</p>
                <p className="text-sm font-medium text-gray-900">{getTypeLabel(schedule.type)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Frequency</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{schedule.frequency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Format</p>
                <p className="text-sm font-medium text-gray-900">{schedule.format}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={schedule.status} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Recipients</p>
              <div className="flex flex-wrap gap-2">
                {schedule.recipients?.map((r) => (
                  <span key={r} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
                    <Mail size={10} />
                    {r}
                  </span>
                ))}
                {(!schedule.recipients || schedule.recipients.length === 0) && (
                  <span className="text-xs text-gray-400">No recipients configured</span>
                )}
              </div>
            </div>
            {schedule.reportConfig && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Configuration</p>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>Date Range: {schedule.reportConfig.dateRange?.replace(/_/g, ' ')}</span>
                  <span>Group By: {schedule.reportConfig.groupBy}</span>
                  {schedule.reportConfig.includeCharts && <span>Charts included</span>}
                  {schedule.reportConfig.includeSummary && <span>Summary included</span>}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Run History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Run History</h3>
        </div>
        {runHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No report runs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Report Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Run Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Format</th>
                </tr>
              </thead>
              <tbody>
                {runHistory.map((run, idx) => (
                  <tr key={`${run.id}-${run.lastRun}`} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-3 text-gray-900 text-xs font-medium">{run.name}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{getTypeLabel(run.type)}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{formatDateTime(run.lastRun)}</td>
                    <td className="py-2 px-3"><StatusBadge status={run.status} /></td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{run.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Scheduled Report</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Report Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Weekly Pipeline Summary"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Report Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Format Selection */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Output Format</label>
                <div className="flex gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormFormat(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        formFormat === f
                          ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipients</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="email"
                    value={formRecipientInput}
                    onChange={(e) => setFormRecipientInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRecipient(); } }}
                    placeholder="recipient@example.com"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formRecipients.map((email) => (
                      <span key={email} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        <Mail size={10} />
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(email)}
                          className="text-gray-400 hover:text-red-500 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  disabled={!formName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={16} />
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
