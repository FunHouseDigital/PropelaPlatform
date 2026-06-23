import { useState, useMemo } from 'react';
import { Search, Download, Calendar, Filter, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { ACCESSIBLE_CHART_COLORS } from '../../lib/chartAccessibility';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'system_alert', label: 'System Alerts' },
  { id: 'task_update', label: 'Task Updates' },
  { id: 'document_expiry', label: 'Document Expiry' },
  { id: 'placement_match', label: 'Placement Matches' },
  { id: 'compliance_warning', label: 'Compliance Warnings' },
];

const SEVERITY_OPTIONS = [
  { id: 'all', label: 'All Severity' },
  { id: 'info', label: 'Info' },
  { id: 'warning', label: 'Warning' },
  { id: 'critical', label: 'Critical' },
];

const STATUS_COLORS = {
  delivered: 'text-blue-600 bg-blue-50',
  read: 'text-green-600 bg-green-50',
  dismissed: 'text-gray-600 bg-gray-100',
  actioned: 'text-purple-600 bg-purple-50',
};

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDateString(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export default function NotificationHistory() {
  const { notificationLog } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredLog = useMemo(() => {
    let items = [...notificationLog];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      items = items.filter((item) => item.severity === severityFilter);
    }

    if (dateFrom) {
      items = items.filter((item) => getDateString(item.timestamp) >= dateFrom);
    }

    if (dateTo) {
      items = items.filter((item) => getDateString(item.timestamp) <= dateTo);
    }

    return items;
  }, [notificationLog, searchQuery, categoryFilter, severityFilter, dateFrom, dateTo]);

  // Chart data: notifications per day for the last 14 days
  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const count = notificationLog.filter((n) => getDateString(n.timestamp) === dateStr).length;
      days.push({ date: label, count });
    }
    return days;
  }, [notificationLog]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Category', 'Severity', 'Title', 'Channel', 'Status'];
    const rows = filteredLog.map((item) => [
      item.id,
      item.timestamp,
      item.categoryLabel,
      item.severity,
      item.title,
      item.channel,
      item.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification History</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Full searchable history of all past notifications ({filteredLog.length} records)
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#5B2D8E] text-white hover:bg-[#4a2574] transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Analytics Chart */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <BarChart3 size={16} />
          Notifications Per Day (Last 14 Days)
        </h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar dataKey="count" fill={ACCESSIBLE_CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Notifications" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.slice(0, 50).map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(item.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-[250px] truncate">
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {item.categoryLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        item.severity === 'critical'
                          ? 'text-red-600 bg-red-50'
                          : item.severity === 'warning'
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-blue-600 bg-blue-50'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                    {item.channel === 'in_app' ? 'In-App' : item.channel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                        STATUS_COLORS[item.status] || 'text-gray-600 bg-gray-100'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLog.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Filter size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications match your filters</p>
          </div>
        )}

        {filteredLog.length > 50 && (
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 text-center">
            Showing 50 of {filteredLog.length} records. Export CSV for full data.
          </div>
        )}
      </div>
    </div>
  );
}
