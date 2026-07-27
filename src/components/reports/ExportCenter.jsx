import { useState, useCallback, useMemo } from 'react';
import {
  Download, Database, FileText, Users, Building, MessageSquare,
  Filter, Clock, RefreshCw,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const DATA_TYPES = [
  { id: 'nurses', label: 'Nurses', icon: Users, description: 'Nurse records and pipeline data' },
  { id: 'placements', label: 'Placements', icon: Building, description: 'Placement history and outcomes' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Document records and statuses' },
  { id: 'communications', label: 'Communications', icon: MessageSquare, description: 'Communication logs and messages' },
];

const FORMATS = [
  { id: 'csv', label: 'CSV', description: 'Comma-separated values' },
  { id: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
];

const NURSE_STAGES = ['All', 'New Applicant', 'Screening', 'Accepted', 'Training', 'OET Prep', 'Placed', 'Settled'];
const PLACEMENT_STAGES = ['All', 'Matching', 'Shortlisted', 'Interview', 'Offered', 'Visa Processing', 'Placed', 'Settled'];

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-green-100 text-green-700',
    processing: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

/**
 * Flatten a single object's nested properties using dot-notation keys.
 * Arrays are converted to semicolon-separated strings.
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val === null || val === undefined) {
      result[fullKey] = '';
    } else if (Array.isArray(val)) {
      result[fullKey] = val.map((item) =>
        typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)
      ).join('; ');
    } else if (typeof val === 'object') {
      const nested = flattenObject(val, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

export default function ExportCenter() {
  const {
    nurses, placements, documents, communications,
    exportHistory, updateExportHistory, cohorts,
  } = useAppContext();

  const [selectedDataType, setSelectedDataType] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [filters, setFilters] = useState({
    stage: 'All',
    cohort: 'All',
    specialty: 'All',
    facility: 'All',
  });

  const cohortOptions = useMemo(() => ['All', ...cohorts.map((c) => c.name)], [cohorts]);
  const facilityOptions = useMemo(() => {
    const names = [...new Set(placements.map((p) => p.facilityName).filter(Boolean))];
    return ['All', ...names.sort()];
  }, [placements]);
  const specialtyOptions = useMemo(() => {
    const specs = [...new Set(nurses.map((n) => n.primaryClinicalSpecialty).filter(Boolean))];
    return ['All', ...specs.sort()];
  }, [nurses]);

  // Get filtered data based on selected type and filters
  const getFilteredData = useCallback(() => {
    if (!selectedDataType) return [];

    switch (selectedDataType) {
      case 'nurses': {
        let data = [...nurses];
        if (filters.stage !== 'All') {
          data = data.filter((n) => n.pipelineStage === filters.stage);
        }
        if (filters.cohort !== 'All') {
          data = data.filter((n) => n.cohortAssigned === filters.cohort);
        }
        if (filters.specialty !== 'All') {
          data = data.filter((n) => n.primaryClinicalSpecialty === filters.specialty);
        }
        return data;
      }
      case 'placements': {
        let data = [...placements];
        if (filters.stage !== 'All') {
          data = data.filter((p) => p.currentStage === filters.stage);
        }
        if (filters.facility !== 'All') {
          data = data.filter((p) => p.facilityName === filters.facility);
        }
        return data;
      }
      case 'documents': {
        return [...documents];
      }
      case 'communications': {
        return [...communications];
      }
      default:
        return [];
    }
  }, [selectedDataType, filters, nurses, placements, documents, communications]);

  // Generate file content
  const generateFileContent = useCallback((data, format) => {
    if (data.length === 0) return null;

    const exportFormat = format || selectedFormat;

    if (exportFormat === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV generation - flatten nested objects
    const flatData = data.map((row) => flattenObject(row));

    // Collect all headers from all rows to handle heterogeneous shapes
    const headerSet = new Set();
    flatData.forEach((row) => {
      Object.keys(row).forEach((key) => headerSet.add(key));
    });
    const headers = Array.from(headerSet);

    const csvRows = [headers.map((h) => {
      if (h.includes(',') || h.includes('"')) {
        return `"${h.replace(/"/g, '""')}"`;
      }
      return h;
    }).join(',')];

    flatData.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }, [selectedFormat]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!selectedDataType) return;

    const data = getFilteredData();
    if (data.length === 0) return;

    const content = generateFileContent(data, selectedFormat);
    if (!content) return;

    const mimeType = selectedFormat === 'json' ? 'application/json' : 'text/csv';
    const extension = selectedFormat === 'json' ? 'json' : 'csv';
    const fileName = `propela-${selectedDataType}-export-${new Date().toISOString().slice(0, 10)}.${extension}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Record in export history
    const historyEntry = {
      id: `export-${Date.now()}`,
      type: selectedDataType,
      format: selectedFormat.toUpperCase(),
      filters: { ...filters },
      timestamp: new Date().toISOString(),
      fileSize: `${(blob.size / 1024).toFixed(1)} KB`,
      status: 'completed',
      fileName,
    };

    updateExportHistory([historyEntry, ...exportHistory]);
  }, [selectedDataType, selectedFormat, filters, getFilteredData, generateFileContent, exportHistory, updateExportHistory]);

  // Re-download from history (regenerate file with original filters)
  const handleRedownload = useCallback((entry) => {
    // Re-generate from current data for the given type, applying stored filters
    let data;
    switch (entry.type) {
      case 'nurses':
        data = [...nurses];
        break;
      case 'placements':
        data = [...placements];
        break;
      case 'documents':
        data = [...documents];
        break;
      case 'communications':
        data = [...communications];
        break;
      default:
        data = [];
    }

    if (data.length === 0) return;

    // Apply the stored filters from the original export
    const storedFilters = entry.filters || {};
    if (entry.type === 'nurses') {
      if (storedFilters.stage && storedFilters.stage !== 'All') {
        data = data.filter((n) => n.pipelineStage === storedFilters.stage);
      }
      if (storedFilters.cohort && storedFilters.cohort !== 'All') {
        data = data.filter((n) => n.cohortAssigned === storedFilters.cohort);
      }
      if (storedFilters.specialty && storedFilters.specialty !== 'All') {
        data = data.filter((n) => n.primaryClinicalSpecialty === storedFilters.specialty);
      }
    } else if (entry.type === 'placements') {
      if (storedFilters.stage && storedFilters.stage !== 'All') {
        data = data.filter((p) => p.currentStage === storedFilters.stage);
      }
      if (storedFilters.facility && storedFilters.facility !== 'All') {
        data = data.filter((p) => p.facilityName === storedFilters.facility);
      }
    }

    if (data.length === 0) return;

    const format = entry.format.toLowerCase();
    const content = generateFileContent(data, format);
    if (!content) return;

    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    const extension = format === 'json' ? 'json' : 'csv';
    const fileName = entry.fileName || `propela-${entry.type}-export.${extension}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [nurses, placements, documents, communications, generateFileContent]);

  const filteredCount = useMemo(() => {
    if (!selectedDataType) return 0;
    return getFilteredData().length;
  }, [selectedDataType, getFilteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database size={20} className="text-[#5B2D8E]" />
        <h2 className="text-lg font-semibold text-gray-900">Export Center</h2>
      </div>

      {/* Data Type Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Data Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DATA_TYPES.map((dt) => {
            const Icon = dt.icon;
            return (
              <button
                key={dt.id}
                onClick={() => {
                  setSelectedDataType(dt.id);
                  setFilters({ stage: 'All', cohort: 'All', specialty: 'All', facility: 'All' });
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                  selectedDataType === dt.id
                    ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon
                  size={24}
                  className={selectedDataType === dt.id ? 'text-[#5B2D8E]' : 'text-gray-400'}
                />
                <span className={`text-sm font-medium ${selectedDataType === dt.id ? 'text-[#5B2D8E]' : 'text-gray-700'}`}>
                  {dt.label}
                </span>
                <span className="text-xs text-gray-400 text-center">{dt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Export Format</h3>
        <div className="flex gap-3">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-xl border transition-colors ${
                selectedFormat === f.id
                  ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${selectedFormat === f.id ? 'text-[#5B2D8E]' : 'text-gray-700'}`}>
                {f.label}
              </span>
              <span className="text-xs text-gray-400">{f.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel (contextual) */}
      {selectedDataType && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-[#5B2D8E]" />
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            <span className="text-xs text-gray-400 ml-auto">{filteredCount} records match</span>
          </div>

          {selectedDataType === 'nurses' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pipeline Stage</label>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {NURSE_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
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
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedDataType === 'placements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Placement Stage</label>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {PLACEMENT_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Facility</label>
                <select
                  value={filters.facility}
                  onChange={(e) => setFilters((prev) => ({ ...prev, facility: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                >
                  {facilityOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedDataType === 'documents' && (
            <p className="text-xs text-gray-400">All documents will be exported. No additional filters available.</p>
          )}

          {selectedDataType === 'communications' && (
            <p className="text-xs text-gray-400">All communication records will be exported. No additional filters available.</p>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleExport}
          disabled={!selectedDataType || filteredCount === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={16} />
          Export {selectedDataType ? `${filteredCount} Records` : 'Data'}
        </button>
        {selectedDataType && (
          <span className="text-xs text-gray-400">
            Format: {selectedFormat.toUpperCase()} | Type: {selectedDataType}
          </span>
        )}
      </div>

      {/* Download History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Download History</h3>
        </div>
        {exportHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No exports yet. Select a data type and export to see history here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Timestamp</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Data Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Format</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">File Size</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((entry, idx) => (
                  <tr key={entry.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-3 text-gray-700 text-xs">{formatDateTime(entry.timestamp)}</td>
                    <td className="py-2 px-3 text-gray-900 text-xs font-medium capitalize">{entry.type?.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{entry.format}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs">{entry.fileSize}</td>
                    <td className="py-2 px-3"><StatusBadge status={entry.status} /></td>
                    <td className="py-2 px-3">
                      {entry.status === 'completed' && (
                        <button
                          onClick={() => handleRedownload(entry)}
                          className="flex items-center gap-1 text-[#5B2D8E] hover:text-[#4a2474] text-xs font-medium transition-colors"
                          title="Re-download"
                        >
                          <RefreshCw size={12} />
                          Re-download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
