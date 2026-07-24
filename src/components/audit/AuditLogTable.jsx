import { useState, useMemo } from 'react';
import { Search, Download, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useExport } from '../../hooks/useExport';
import { toCsv } from '../../lib/csv';

const EXPORT_MODULE = 'Settings';

const SEVERITY_BADGES = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

const PAGE_SIZES = [10, 25, 50, 100];

export default function AuditLogTable() {
  const { auditLog } = useAppContext();
  const { runExport, canExport } = useExport();
  const canExportData = canExport(EXPORT_MODULE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportError, setExportError] = useState('');

  const filteredAndSorted = useMemo(() => {
    let entries = [...auditLog];

    // Filter by search query across all text fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.timestamp.toLowerCase().includes(query) ||
          e.user.toLowerCase().includes(query) ||
          e.action.toLowerCase().includes(query) ||
          e.entityType.toLowerCase().includes(query) ||
          e.entityId.toLowerCase().includes(query) ||
          e.ipAddress.toLowerCase().includes(query) ||
          e.details.toLowerCase().includes(query)
      );
    }

    // Sort
    entries.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return entries;
  }, [auditLog, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const paginatedEntries = filteredAndSorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details', 'Severity'];
    const rows = filteredAndSorted.map((entry) => [
      entry.timestamp,
      entry.user,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.ipAddress,
      entry.details,
      entry.severity,
    ]);

    // Shared CSV util: neutralizes formula injection (audit Details/User are
    // free-text) and applies RFC-4180 quoting for every cell.
    const csvContent = toCsv(rows, { headers });

    // The audit log is sensitive — gate behind the Settings permission and
    // audit the attempt (the new entry will itself appear in this log).
    const { allowed, error } = runExport(
      {
        module: EXPORT_MODULE,
        entityType: 'audit-log',
        format: 'CSV',
        recordCount: filteredAndSorted.length,
        filters: searchQuery ? { search: searchQuery } : null,
      },
      () => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    );

    setExportError(allowed ? '' : error);
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDirection === 'asc' ? (
      <ChevronUp size={12} className="text-[#5B2D8E]" />
    ) : (
      <ChevronDown size={12} className="text-[#5B2D8E]" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search audit log..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          />
        </div>
        {canExportData ? (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-md hover:bg-[#4a2574] transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        ) : (
          <span
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
            title="You don't have permission to export the audit log"
          >
            <Lock size={14} />
            Export CSV
          </span>
        )}
      </div>
      {exportError && (
        <p role="alert" className="text-sm text-red-600 font-medium">{exportError}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { id: 'timestamp', label: 'Timestamp' },
                  { id: 'user', label: 'User' },
                  { id: 'action', label: 'Action' },
                  { id: 'entityType', label: 'Entity Type' },
                  { id: 'entityId', label: 'Entity ID' },
                  { id: 'ipAddress', label: 'IP Address' },
                  { id: 'details', label: 'Details' },
                ].map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIndicator field={col.id} />
                    </div>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{entry.user}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.action}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{entry.entityType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{entry.entityId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{entry.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{entry.details}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          SEVERITY_BADGES[entry.severity] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {entry.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm bg-white"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>entries</span>
            <span className="ml-4 text-gray-500">
              Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm rounded border ${
                    currentPage === pageNum
                      ? 'bg-[#5B2D8E] text-white border-[#5B2D8E]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 text-sm rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
