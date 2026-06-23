import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { OUTREACH_OUTCOMES, PREFERRED_CHANNELS, PROVINCES, ACQUISITION_TRACKS } from '../../lib/constants';
import { useDebouncedValue } from '../../hooks/useDebounce';

function getOutcomeColor(outcome) {
  if (!outcome) return 'bg-gray-100 text-gray-600';
  if (outcome.includes('positive') || outcome.includes('booked') || outcome.includes('received')) {
    return 'bg-green-100 text-green-700';
  }
  if (outcome.includes('Declined') || outcome.includes('Bounced')) {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-600';
}

function getTrackColor(track) {
  switch (track) {
    case 'Organisations': return 'bg-purple-100 text-purple-700';
    case 'Referral Network': return 'bg-blue-100 text-blue-700';
    case 'Community Channels': return 'bg-teal-100 text-teal-700';
    case 'Events': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function OutreachTable() {
  const { facilities, referrers, communityChannels, events } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    tracks: [],
    channels: [],
    outcomes: [],
    province: '',
  });
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Aggregate all outreach entries from all tracks
  const allEntries = useMemo(() => {
    const entries = [];

    // Organisations track
    facilities.forEach((f) => {
      (f.outreachLog || []).forEach((entry) => {
        entries.push({
          ...entry,
          track: 'Organisations',
          recordName: f.name,
          organisationType: f.type || '',
          province: f.province || '',
          cohortCycle: '',
        });
      });
    });

    // Referral Network track
    referrers.forEach((r) => {
      (r.outreachLog || []).forEach((entry) => {
        entries.push({
          ...entry,
          track: 'Referral Network',
          recordName: r.name,
          organisationType: r.type || '',
          province: r.province || '',
          cohortCycle: '',
        });
      });
    });

    // Community Channels track
    communityChannels.forEach((c) => {
      (c.outreachLog || []).forEach((entry) => {
        entries.push({
          ...entry,
          track: 'Community Channels',
          recordName: c.name,
          organisationType: c.type || '',
          province: c.province || '',
          cohortCycle: '',
        });
      });
    });

    // Events track
    events.forEach((ev) => {
      (ev.outreachLog || []).forEach((entry) => {
        entries.push({
          ...entry,
          track: 'Events',
          recordName: ev.name,
          organisationType: ev.type || '',
          province: ev.province || '',
          cohortCycle: '',
        });
      });
    });

    return entries;
  }, [facilities, referrers, communityChannels, events]);

  // Apply filters and search
  const filteredEntries = useMemo(() => {
    let result = [...allEntries];

    // Search
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter((e) =>
        (e.contactPerson || '').toLowerCase().includes(q) ||
        (e.templateUsed || '').toLowerCase().includes(q) ||
        (e.subjectLine || '').toLowerCase().includes(q) ||
        (e.messageSummary || '').toLowerCase().includes(q) ||
        (e.recordName || '').toLowerCase().includes(q) ||
        (e.channel || '').toLowerCase().includes(q) ||
        (e.outcome || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    }

    // Date range
    if (filters.dateFrom) {
      result = result.filter((e) => e.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((e) => e.date <= filters.dateTo);
    }

    // Track filter
    if (filters.tracks.length > 0) {
      result = result.filter((e) => filters.tracks.includes(e.track));
    }

    // Channel filter
    if (filters.channels.length > 0) {
      result = result.filter((e) => filters.channels.includes(e.channel));
    }

    // Outcome filter
    if (filters.outcomes.length > 0) {
      result = result.filter((e) => filters.outcomes.includes(e.outcome));
    }

    // Province filter
    if (filters.province) {
      result = result.filter((e) => e.province === filters.province);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (sortField === 'date') {
        aVal = aVal || '0000-00-00';
        bVal = bVal || '0000-00-00';
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allEntries, debouncedSearchQuery, filters, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function toggleArrayFilter(key, value) {
    setFilters((prev) => {
      const arr = prev[key];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  }

  function clearFilters() {
    setFilters({ dateFrom: '', dateTo: '', tracks: [], channels: [], outcomes: [], province: '' });
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-propela-purple" />
      : <ArrowDown size={12} className="text-propela-purple" />;
  };

  const activeFilterCount = filters.tracks.length + filters.channels.length + filters.outcomes.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0) + (filters.province ? 1 : 0);

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search outreach entries..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-propela-purple focus:border-propela-purple"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? 'border-propela-purple text-propela-purple bg-propela-purple-light'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-propela-purple text-white rounded-full">{activeFilterCount}</span>
          )}
        </button>
        <span className="text-xs text-gray-400">{filteredEntries.length} entries</span>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase">Filter Options</h4>
            <button onClick={clearFilters} className="text-xs text-propela-purple hover:underline">
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              />
            </div>
            {/* Province */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Province</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters({ ...filters, province: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              >
                <option value="">All provinces</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {/* Track */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Track</label>
              <div className="flex flex-wrap gap-1">
                {ACQUISITION_TRACKS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleArrayFilter('tracks', t)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      filters.tracks.includes(t)
                        ? 'bg-propela-purple text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Channel */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Channel</label>
              <div className="flex flex-wrap gap-1">
                {PREFERRED_CHANNELS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleArrayFilter('channels', c)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      filters.channels.includes(c)
                        ? 'bg-propela-purple text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {/* Outcome */}
            <div className="col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-500 block mb-1">Outcome</label>
              <div className="flex flex-wrap gap-1">
                {OUTREACH_OUTCOMES.map((o) => (
                  <button
                    key={o}
                    onClick={() => toggleArrayFilter('outcomes', o)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      filters.outcomes.includes(o)
                        ? 'bg-propela-purple text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-1">Date <SortIcon field="date" /></div>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject / Summary</th>
                <th
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('outcome')}
                >
                  <div className="flex items-center gap-1">Outcome <SortIcon field="outcome" /></div>
                </th>
                <th
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('track')}
                >
                  <div className="flex items-center gap-1">Track <SortIcon field="track" /></div>
                </th>
                <th
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('recordName')}
                >
                  <div className="flex items-center gap-1">Record <SortIcon field="recordName" /></div>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400 text-sm">
                    No outreach entries found. Add entries from the Acquisition Hub tracks.
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, 100).map((entry, idx) => (
                  <tr key={entry.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{entry.date || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {entry.channel || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 truncate max-w-[120px]">{entry.contactPerson || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 truncate max-w-[120px]">{entry.templateUsed || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 truncate max-w-[200px]">
                      {entry.subjectLine || entry.messageSummary || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      {entry.outcome ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOutcomeColor(entry.outcome)}`}>
                          {entry.outcome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTrackColor(entry.track)}`}>
                        {entry.track}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 truncate max-w-[150px]">{entry.recordName || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {entry.followUpDate || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredEntries.length > 100 && (
            <div className="px-3 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
              Showing 100 of {filteredEntries.length} entries. Use filters to narrow results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
