import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, Save, Trash2, Play, Calendar, Mail, Clock,
  CheckSquare, Filter, Database,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getReportTemplates, saveReportTemplates } from '../../lib/storage';

const METRIC_OPTIONS = [
  { id: 'nursePipeline', label: 'Nurse Pipeline' },
  { id: 'oetResults', label: 'OET Results' },
  { id: 'placementOutcomes', label: 'Placement Outcomes' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'cohortPerformance', label: 'Cohort Performance' },
  { id: 'acquisitionSources', label: 'Acquisition Sources' },
];

const SPECIALTIES = [
  'All', 'Medical/Surgical', 'ICU', 'Theatre', 'Paediatrics', 'Midwifery',
  'Mental Health', 'Emergency', 'Oncology', 'PHC-Community', 'Maternity', 'Renal',
];

const SOURCES = [
  'All', 'Direct application', 'Organisation referral', 'Community channel',
  'Referral from placed nurse', 'Event', 'LinkedIn', 'WhatsApp', 'Word of mouth',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];

export default function ReportBuilder() {
  const { nurses, cohorts, placements } = useAppContext();

  // Form state
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ cohort: 'All', specialty: 'All', source: 'All' });
  const [previewData, setPreviewData] = useState(null);

  // Templates state
  const [templates, setTemplates] = useState(() => getReportTemplates());
  const [templateName, setTemplateName] = useState('');

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('Weekly');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [showScheduleToast, setShowScheduleToast] = useState(false);

  // Toggle metric selection
  const toggleMetric = useCallback((metricId) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((m) => m !== metricId)
        : [...prev, metricId]
    );
  }, []);

  // Filter nurses based on selections
  const filteredNurses = useMemo(() => {
    let result = [...nurses];
    if (filters.cohort !== 'All') {
      result = result.filter((n) => n.cohortAssigned === filters.cohort);
    }
    if (filters.specialty !== 'All') {
      result = result.filter((n) => n.primaryClinicalSpecialty === filters.specialty);
    }
    if (filters.source !== 'All') {
      result = result.filter((n) => n.source === filters.source);
    }
    return result;
  }, [nurses, filters]);

  // Generate report data
  const generateReport = useCallback(() => {
    if (selectedMetrics.length === 0) return;

    const data = { columns: [], rows: [] };

    if (selectedMetrics.includes('nursePipeline')) {
      data.columns.push(...['ID', 'Name', 'Stage', 'Score', 'Cohort']);
      filteredNurses.forEach((n) => {
        data.rows.push({
          type: 'nursePipeline',
          ID: n.id,
          Name: `${n.firstName} ${n.surname}`,
          Stage: n.pipelineStage,
          Score: n.finalScore || 0,
          Cohort: n.cohortAssigned || 'Unassigned',
        });
      });
    }

    if (selectedMetrics.includes('oetResults')) {
      if (!data.columns.includes('Name')) data.columns.push('Name');
      if (!data.columns.includes('OET Status')) data.columns.push('OET Status', 'EfSet Score');
      filteredNurses.forEach((n) => {
        data.rows.push({
          type: 'oetResults',
          Name: `${n.firstName} ${n.surname}`,
          'OET Status': n.oetStatus || 'Pending',
          'EfSet Score': n.efSetScore || 'N/A',
        });
      });
    }

    if (selectedMetrics.includes('placementOutcomes')) {
      if (!data.columns.includes('Nurse')) data.columns.push('Nurse');
      data.columns.push('Facility', 'Placement Stage', 'Match Score');
      placements.forEach((p) => {
        data.rows.push({
          type: 'placementOutcomes',
          Nurse: p.nurseName,
          Facility: p.facilityName,
          'Placement Stage': p.currentStage,
          'Match Score': p.matchScore || 'N/A',
        });
      });
    }

    if (selectedMetrics.includes('revenue')) {
      data.columns.push('Month', 'Amount (GBP)');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const placedCount = placements.filter(
        (p) => p.currentStage === 'Placed' || p.currentStage === 'Settled'
      ).length;
      months.forEach((month, idx) => {
        data.rows.push({
          type: 'revenue',
          Month: month,
          'Amount (GBP)': Math.floor(placedCount * 5000 * (0.2 + idx * 0.18)),
        });
      });
    }

    if (selectedMetrics.includes('cohortPerformance')) {
      data.columns.push('Cohort Name', 'Pass Rate (%)', 'Placement Rate (%)', 'Budget (ZAR)');
      cohorts.forEach((c) => {
        const cohortNurses = nurses.filter(
          (n) => n.cohortAssigned === 'Cohort 1' || n.cohortAssigned === c.name
        );
        const totalInCohort = cohortNurses.length || 1;
        const passRate = Math.round(
          (cohortNurses.filter((n) => n.oetStatus === 'Passed').length / totalInCohort) * 100
        );
        const placeRate = Math.round(
          (cohortNurses.filter((n) => n.pipelineStage === 'Placed').length / totalInCohort) * 100
        );
        data.rows.push({
          type: 'cohortPerformance',
          'Cohort Name': c.name,
          'Pass Rate (%)': passRate,
          'Placement Rate (%)': placeRate,
          'Budget (ZAR)': c.budget?.totalBudget || 0,
        });
      });
    }

    if (selectedMetrics.includes('acquisitionSources')) {
      data.columns.push('Source', 'Count', 'Percentage (%)');
      const sourceCounts = {};
      filteredNurses.forEach((n) => {
        const src = n.source || 'Unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const total = filteredNurses.length || 1;
      Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          data.rows.push({
            type: 'acquisitionSources',
            Source: source,
            Count: count,
            'Percentage (%)': Math.round((count / total) * 100),
          });
        });
    }

    // Deduplicate columns
    data.columns = [...new Set(data.columns)];
    setPreviewData(data);
  }, [selectedMetrics, filteredNurses, placements, cohorts, nurses]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!previewData || previewData.rows.length === 0) return;

    const headers = previewData.columns;
    const csvRows = [headers.join(',')];
    previewData.rows.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] !== undefined ? String(row[h]) : '';
        // Escape commas and quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propela-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [previewData]);

  // Save template
  const saveTemplate = useCallback(() => {
    if (!templateName.trim()) return;
    const newTemplate = {
      id: `tmpl-${Date.now()}`,
      name: templateName.trim(),
      metrics: [...selectedMetrics],
      dateRange: { ...dateRange },
      filters: { ...filters },
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveReportTemplates(updated);
    setTemplateName('');
  }, [templateName, selectedMetrics, dateRange, filters, templates]);

  // Load template
  const loadTemplate = useCallback((template) => {
    setSelectedMetrics(template.metrics || []);
    setDateRange(template.dateRange || { start: '', end: '' });
    setFilters(template.filters || { cohort: 'All', specialty: 'All', source: 'All' });
  }, []);

  // Delete template
  const deleteTemplate = useCallback((templateId) => {
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    saveReportTemplates(updated);
  }, [templates]);

  // Save schedule (mock)
  const saveSchedule = useCallback(() => {
    setShowScheduleToast(true);
    setTimeout(() => setShowScheduleToast(false), 3000);
  }, []);

  const cohortOptions = useMemo(
    () => ['All', ...cohorts.map((c) => c.name)],
    [cohorts]
  );

  return (
    <div className="space-y-6">
      {/* Metrics Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Select Metrics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRIC_OPTIONS.map((metric) => (
            <label
              key={metric.id}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedMetrics.includes(metric.id)
                  ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.id)}
                onChange={() => toggleMetric(metric.id)}
                className="rounded border-gray-300 text-[#5B2D8E] focus:ring-[#5B2D8E]"
              />
              <span className="text-xs font-medium text-gray-700">{metric.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Range */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">Date Range</h3>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cohort</label>
              <select
                value={filters.cohort}
                onChange={(e) => setFilters((prev) => ({ ...prev, cohort: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              >
                {cohortOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Specialty</label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters((prev) => ({ ...prev, specialty: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Generate & Export Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateReport}
          disabled={selectedMetrics.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={16} />
          Generate Report
        </button>
        {previewData && previewData.rows.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-[#5B2D8E] text-[#5B2D8E] rounded-lg text-sm font-medium hover:bg-[#5B2D8E]/5 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
      </div>

      {/* Report Preview Table */}
      {previewData && previewData.rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">
              Report Preview ({previewData.rows.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  {previewData.columns.map((col) => (
                    <th key={col} className="text-left py-2 px-3 text-gray-500 font-medium text-xs">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {previewData.columns.map((col) => (
                      <td key={col} className="py-2 px-3 text-gray-700 text-xs">
                        {row[col] !== undefined ? String(row[col]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.rows.length > 50 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Showing first 50 of {previewData.rows.length} rows. Export CSV for full data.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Saved Templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Saved Templates</h3>
        </div>

        {/* Save new template */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
          />
          <button
            onClick={saveTemplate}
            disabled={!templateName.trim() || selectedMetrics.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={14} />
            Save Template
          </button>
        </div>

        {/* Template cards */}
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">No saved templates yet. Select metrics and save a template above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tmpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tmpl.metrics.length} metric{tmpl.metrics.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <button
                  onClick={() => loadTemplate(tmpl)}
                  className="text-xs text-[#5B2D8E] font-medium hover:underline text-left"
                >
                  Load template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Reports (Mock UI) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Schedule Reports</h3>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setScheduleEnabled(!scheduleEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              scheduleEnabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                scheduleEnabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-sm text-gray-700">Enable scheduled reports</span>
        </div>

        {scheduleEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <input
                    type="email"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={saveSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] transition-colors"
            >
              <Save size={14} />
              Save Schedule
            </button>
          </div>
        )}

        {/* Toast notification */}
        {showScheduleToast && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              Schedule saved successfully! Reports will be sent {scheduleFrequency.toLowerCase()} to {scheduleEmail || 'the specified email'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
