import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FileText,
  Download,
  Play,
  Calendar,
  GripVertical,
  Layers,
  BarChart3,
  Users,
  Building2,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useExport } from '../../hooks/useExport';
import { toCsv } from '../../lib/csv';

const EXPORT_MODULE = 'Analytics';

const REPORT_TYPES = [
  { id: 'nurse_pipeline_summary', label: 'Nurse Pipeline Summary', icon: Users },
  { id: 'compliance_status', label: 'Compliance Status', icon: FileText },
  { id: 'placement_outcomes', label: 'Placement Outcomes', icon: Building2 },
  { id: 'cohort_progress', label: 'Cohort Progress', icon: BarChart3 },
  { id: 'communication_activity', label: 'Communication Activity', icon: MessageSquare },
];

const FIELDS_BY_REPORT_TYPE = {
  nurse_pipeline_summary: [
    { id: 'name', label: 'Name' },
    { id: 'stage', label: 'Stage' },
    { id: 'score', label: 'Score' },
    { id: 'cohort', label: 'Cohort' },
    { id: 'specialty', label: 'Specialty' },
    { id: 'source', label: 'Source' },
  ],
  compliance_status: [
    { id: 'name', label: 'Name' },
    { id: 'compliance_pct', label: 'Compliance %' },
    { id: 'missing_docs', label: 'Missing Docs' },
    { id: 'expiring_docs', label: 'Expiring Docs' },
  ],
  placement_outcomes: [
    { id: 'nurse', label: 'Nurse' },
    { id: 'facility', label: 'Facility' },
    { id: 'stage', label: 'Stage' },
    { id: 'match_score', label: 'Match Score' },
    { id: 'start_date', label: 'Start Date' },
  ],
  cohort_progress: [
    { id: 'cohort_name', label: 'Cohort Name' },
    { id: 'pass_rate', label: 'Pass Rate' },
    { id: 'placement_rate', label: 'Placement Rate' },
    { id: 'budget', label: 'Budget' },
  ],
  communication_activity: [
    { id: 'nurse', label: 'Nurse' },
    { id: 'channel', label: 'Channel' },
    { id: 'type', label: 'Type' },
    { id: 'date', label: 'Date' },
    { id: 'status', label: 'Status' },
  ],
};

const GROUPING_OPTIONS = [
  { id: 'none', label: 'No Grouping' },
  { id: 'by_cohort', label: 'By Cohort' },
  { id: 'by_stage', label: 'By Stage' },
  { id: 'by_facility', label: 'By Facility' },
  { id: 'by_month', label: 'By Month' },
];

function SortableFieldChip({ id, label, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 bg-[#5B2D8E]/5 border border-[#5B2D8E]/20 rounded-lg text-sm text-gray-800"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={14} />
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <button
        onClick={() => onRemove(id)}
        className="text-gray-400 hover:text-red-500 text-xs font-bold"
      >
        x
      </button>
    </div>
  );
}

function AvailableFieldChip({ field, onAdd }) {
  return (
    <button
      onClick={() => onAdd(field)}
      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-[#5B2D8E] hover:bg-[#5B2D8E]/5 transition-colors cursor-pointer"
    >
      + {field.label}
    </button>
  );
}

export default function ReportBuilder() {
  // eslint-disable-next-line no-unused-vars
  const { nurses, cohorts, placements, facilities, communications } = useAppContext();
  const { runExport, canExport } = useExport();
  const canExportData = canExport(EXPORT_MODULE);

  const [reportType, setReportType] = useState('nurse_pipeline_summary');
  const [selectedFields, setSelectedFields] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [grouping, setGrouping] = useState('none');
  const [previewData, setPreviewData] = useState(null);
  const [exportError, setExportError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const availableFields = useMemo(() => {
    const allFields = FIELDS_BY_REPORT_TYPE[reportType] || [];
    return allFields.filter((f) => !selectedFields.find((sf) => sf.id === f.id));
  }, [reportType, selectedFields]);

  const handleReportTypeChange = useCallback((typeId) => {
    setReportType(typeId);
    setSelectedFields([]);
    setPreviewData(null);
  }, []);

  const addField = useCallback((field) => {
    setSelectedFields((prev) => [...prev, field]);
  }, []);

  const removeField = useCallback((fieldId) => {
    setSelectedFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSelectedFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const generateReport = useCallback(() => {
    if (selectedFields.length === 0) return;

    let rows = [];

    if (reportType === 'nurse_pipeline_summary') {
      let filtered = [...nurses];
      if (dateRange.start) filtered = filtered.filter((n) => n.submittedAt >= dateRange.start);
      if (dateRange.end) filtered = filtered.filter((n) => n.submittedAt <= dateRange.end);

      if (grouping === 'by_cohort') {
        const groups = {};
        filtered.forEach((n) => {
          const key = n.cohortAssigned || 'Unassigned';
          if (!groups[key]) groups[key] = { count: 0, totalScore: 0 };
          groups[key].count++;
          groups[key].totalScore += n.finalScore || 0;
        });
        rows = Object.entries(groups).map(([key, val]) => ({
          name: `${key} (${val.count} nurses)`,
          stage: '-',
          score: Math.round(val.totalScore / val.count),
          cohort: key,
          specialty: '-',
          source: '-',
        }));
      } else if (grouping === 'by_stage') {
        const groups = {};
        filtered.forEach((n) => {
          const key = n.pipelineStage || 'Unknown';
          if (!groups[key]) groups[key] = { count: 0, totalScore: 0 };
          groups[key].count++;
          groups[key].totalScore += n.finalScore || 0;
        });
        rows = Object.entries(groups).map(([key, val]) => ({
          name: `${key} (${val.count} nurses)`,
          stage: key,
          score: Math.round(val.totalScore / val.count),
          cohort: '-',
          specialty: '-',
          source: '-',
        }));
      } else if (grouping === 'by_month') {
        const groups = {};
        filtered.forEach((n) => {
          const month = n.submittedAt ? n.submittedAt.slice(0, 7) : 'Unknown';
          if (!groups[month]) groups[month] = { count: 0, totalScore: 0 };
          groups[month].count++;
          groups[month].totalScore += n.finalScore || 0;
        });
        rows = Object.entries(groups).sort().map(([key, val]) => ({
          name: `${key} (${val.count} nurses)`,
          stage: '-',
          score: Math.round(val.totalScore / val.count),
          cohort: '-',
          specialty: '-',
          source: '-',
        }));
      } else {
        rows = filtered.map((n) => ({
          name: n.fullName,
          stage: n.pipelineStage,
          score: n.finalScore || 0,
          cohort: n.cohortAssigned || 'Unassigned',
          specialty: n.primaryClinicalSpecialty || '-',
          source: n.source || '-',
        }));
      }
    } else if (reportType === 'compliance_status') {
      let filtered = [...nurses];
      if (dateRange.start) filtered = filtered.filter((n) => n.submittedAt >= dateRange.start);
      if (dateRange.end) filtered = filtered.filter((n) => n.submittedAt <= dateRange.end);

      rows = filtered.map((n) => ({
        name: n.fullName,
        compliance_pct: n.compliancePercentage != null ? `${n.compliancePercentage}%` : '0%',
        missing_docs: n.missingDocuments || 0,
        expiring_docs: n.expiringDocuments || 0,
      }));
    } else if (reportType === 'placement_outcomes') {
      let filtered = [...placements];
      if (dateRange.start) filtered = filtered.filter((p) => (p.contractDetails?.startDate || '') >= dateRange.start);
      if (dateRange.end) filtered = filtered.filter((p) => (p.contractDetails?.startDate || '') <= dateRange.end);

      if (grouping === 'by_facility') {
        const groups = {};
        filtered.forEach((p) => {
          const key = p.facilityName || 'Unknown';
          if (!groups[key]) groups[key] = { count: 0, totalScore: 0 };
          groups[key].count++;
          groups[key].totalScore += p.matchScore || 0;
        });
        rows = Object.entries(groups).map(([key, val]) => ({
          nurse: `${val.count} placements`,
          facility: key,
          stage: '-',
          match_score: Math.round(val.totalScore / val.count),
          start_date: '-',
        }));
      } else if (grouping === 'by_stage') {
        const groups = {};
        filtered.forEach((p) => {
          const key = p.currentStage || 'Unknown';
          if (!groups[key]) groups[key] = { count: 0, totalScore: 0 };
          groups[key].count++;
          groups[key].totalScore += p.matchScore || 0;
        });
        rows = Object.entries(groups).map(([key, val]) => ({
          nurse: `${val.count} placements`,
          facility: '-',
          stage: key,
          match_score: Math.round(val.totalScore / val.count),
          start_date: '-',
        }));
      } else if (grouping === 'by_month') {
        const groups = {};
        filtered.forEach((p) => {
          const month = p.contractDetails?.startDate ? p.contractDetails.startDate.slice(0, 7) : 'Unknown';
          if (!groups[month]) groups[month] = { count: 0, totalScore: 0 };
          groups[month].count++;
          groups[month].totalScore += p.matchScore || 0;
        });
        rows = Object.entries(groups).sort().map(([key, val]) => ({
          nurse: `${val.count} placements`,
          facility: '-',
          stage: '-',
          match_score: Math.round(val.totalScore / val.count),
          start_date: key,
        }));
      } else {
        rows = filtered.map((p) => ({
          nurse: p.nurseName,
          facility: p.facilityName,
          stage: p.currentStage,
          match_score: p.matchScore || 0,
          start_date: p.contractDetails?.startDate || '-',
        }));
      }
    } else if (reportType === 'cohort_progress') {
      rows = cohorts.map((c) => {
        const cohortNurses = nurses.filter((n) => n.cohortAssigned === c.name);
        const total = cohortNurses.length || 1;
        const passRate = Math.round((cohortNurses.filter((n) => n.oetStatus === 'Passed').length / total) * 100);
        const placementRate = Math.round((cohortNurses.filter((n) => n.pipelineStage === 'Placed').length / total) * 100);
        return {
          cohort_name: c.name,
          pass_rate: `${passRate}%`,
          placement_rate: `${placementRate}%`,
          budget: c.budget?.totalBudget ? `R${c.budget.totalBudget.toLocaleString()}` : 'N/A',
        };
      });
    } else if (reportType === 'communication_activity') {
      let filtered = [...communications];
      if (dateRange.start) filtered = filtered.filter((c) => (c.date || '') >= dateRange.start);
      if (dateRange.end) filtered = filtered.filter((c) => (c.date || '') <= dateRange.end);

      if (grouping === 'by_month') {
        const groups = {};
        filtered.forEach((c) => {
          const month = c.date ? c.date.slice(0, 7) : 'Unknown';
          if (!groups[month]) groups[month] = 0;
          groups[month]++;
        });
        rows = Object.entries(groups).sort().map(([key, count]) => ({
          nurse: `${count} messages`,
          channel: '-',
          type: '-',
          date: key,
          status: '-',
        }));
      } else {
        const nurseMap = {};
        nurses.forEach((n) => { nurseMap[n.id] = n.fullName; });
        rows = filtered.map((c) => ({
          nurse: nurseMap[c.nurseId] || c.nurseId,
          channel: c.channel,
          type: c.type,
          date: c.date ? c.date.slice(0, 10) : '-',
          status: c.status,
        }));
      }
    }

    setPreviewData(rows);
  }, [reportType, selectedFields, dateRange, grouping, nurses, cohorts, placements, communications]);

  const exportCSV = useCallback(() => {
    if (!previewData || previewData.length === 0) return;

    const headers = selectedFields.map((f) => f.label);
    // Route through the shared CSV util (formula-injection + RFC-4180 safe).
    // Note the row key (f.id) differs from the header label (f.label).
    const csvString = toCsv(
      previewData.map((row) => selectedFields.map((f) => (row[f.id] !== undefined ? row[f.id] : ''))),
      { headers }
    );

    // Gate + audit the export before producing the file.
    const { allowed, error } = runExport(
      {
        module: EXPORT_MODULE,
        entityType: reportType,
        format: 'CSV',
        recordCount: previewData.length,
        filters: { grouping, start: dateRange.start, end: dateRange.end },
      },
      () => {
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `propela-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    );

    setExportError(allowed ? '' : error);
  }, [previewData, selectedFields, reportType, grouping, dateRange, runExport]);

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Report Type</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = reportType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => handleReportTypeChange(type.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                  isActive
                    ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <Icon size={16} />
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag-and-Drop Field Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GripVertical size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Field Selection</h3>
          <span className="text-xs text-gray-400 ml-2">Click to add, drag to reorder</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Fields */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Available Fields</p>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50">
              {availableFields.length === 0 ? (
                <span className="text-xs text-gray-400">All fields selected</span>
              ) : (
                availableFields.map((field) => (
                  <AvailableFieldChip key={field.id} field={field} onAdd={addField} />
                ))
              )}
            </div>
          </div>

          {/* Selected Fields (sortable) */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Selected Fields (drag to reorder)</p>
            <div className="min-h-[60px] p-3 border border-dashed border-[#5B2D8E]/30 rounded-lg bg-[#5B2D8E]/[0.02]">
              {selectedFields.length === 0 ? (
                <span className="text-xs text-gray-400">Click fields on the left to add them here</span>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedFields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedFields.map((field) => (
                        <SortableFieldChip
                          key={field.id}
                          id={field.id}
                          label={field.label}
                          onRemove={removeField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Range and Grouping */}
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

        {/* Grouping / Aggregation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">Grouping / Aggregation</h3>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Group results by</label>
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            >
              {GROUPING_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Generate & Export Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateReport}
          disabled={selectedFields.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={16} />
          Generate Report
        </button>
        {previewData && previewData.length > 0 && canExportData && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-[#5B2D8E] text-[#5B2D8E] rounded-lg text-sm font-medium hover:bg-[#5B2D8E]/5 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
        {previewData && previewData.length > 0 && !canExportData && (
          <span
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
            title="You don't have permission to export this data"
          >
            <Lock size={16} />
            Export CSV
          </span>
        )}
      </div>
      {exportError && (
        <p role="alert" className="text-sm text-red-600 font-medium -mt-3">{exportError}</p>
      )}

      {/* Report Preview Table */}
      {previewData && previewData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">
              Report Preview ({previewData.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  {selectedFields.map((f) => (
                    <th key={f.id} className="text-left py-2 px-3 text-gray-500 font-medium text-xs">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {selectedFields.map((f) => (
                      <td key={f.id} className="py-2 px-3 text-gray-700 text-xs">
                        {row[f.id] !== undefined ? String(row[f.id]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 50 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Showing first 50 of {previewData.length} rows. Export CSV for full data.
              </p>
            )}
          </div>
        </div>
      )}

      {previewData && previewData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">No data matches the selected criteria. Try adjusting the date range or report type.</p>
        </div>
      )}
    </div>
  );
}
