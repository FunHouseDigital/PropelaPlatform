import { useState, useMemo } from 'react';
import {
  UserPlus,
  FileUp,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  Mail,
  Settings,
  LogIn,
  LogOut,
  Edit,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const ACTION_ICONS = {
  'nurse.created': UserPlus,
  'nurse.updated': Edit,
  'nurse.status_changed': Users,
  'document.uploaded': FileUp,
  'document.verified': CheckCircle,
  'document.expired': XCircle,
  'placement.assigned': MapPin,
  'placement.completed': CheckCircle,
  'placement.cancelled': XCircle,
  'cohort.created': Users,
  'cohort.updated': Edit,
  'communication.sent': Mail,
  'communication.received': Mail,
  'settings.updated': Settings,
  'user.login': LogIn,
  'user.logout': LogOut,
};

const ACTION_COLORS = {
  'nurse.created': 'bg-green-100 text-green-600',
  'nurse.updated': 'bg-blue-100 text-blue-600',
  'nurse.status_changed': 'bg-yellow-100 text-yellow-600',
  'document.uploaded': 'bg-purple-100 text-purple-600',
  'document.verified': 'bg-green-100 text-green-600',
  'document.expired': 'bg-red-100 text-red-600',
  'placement.assigned': 'bg-blue-100 text-blue-600',
  'placement.completed': 'bg-green-100 text-green-600',
  'placement.cancelled': 'bg-red-100 text-red-600',
  'cohort.created': 'bg-purple-100 text-purple-600',
  'cohort.updated': 'bg-blue-100 text-blue-600',
  'communication.sent': 'bg-indigo-100 text-indigo-600',
  'communication.received': 'bg-indigo-100 text-indigo-600',
  'settings.updated': 'bg-gray-100 text-gray-600',
  'user.login': 'bg-green-100 text-green-600',
  'user.logout': 'bg-gray-100 text-gray-600',
};

function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function formatActionDescription(action) {
  const parts = action.split('.');
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1].replace(/_/g, ' ')}`;
  }
  return action;
}

export default function ActivityFeed() {
  const { activityFeed } = useAppContext();
  const [expandedId, setExpandedId] = useState(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const uniqueActions = useMemo(() => {
    const actions = [...new Set(activityFeed.map((e) => e.action))];
    return actions.sort();
  }, [activityFeed]);

  const uniqueUsers = useMemo(() => {
    const users = [...new Set(activityFeed.map((e) => e.user))];
    return users.sort();
  }, [activityFeed]);

  const uniqueEntityTypes = useMemo(() => {
    const types = [...new Set(activityFeed.map((e) => e.entityType))];
    return types.sort();
  }, [activityFeed]);

  const filteredEntries = useMemo(() => {
    let entries = [...activityFeed];

    if (actionFilter !== 'all') {
      entries = entries.filter((e) => e.action === actionFilter);
    }
    if (userFilter !== 'all') {
      entries = entries.filter((e) => e.user === userFilter);
    }
    if (entityTypeFilter !== 'all') {
      entries = entries.filter((e) => e.entityType === entityTypeFilter);
    }
    if (dateFrom) {
      entries = entries.filter((e) => e.timestamp >= dateFrom);
    }
    if (dateTo) {
      entries = entries.filter((e) => e.timestamp <= dateTo + 'T23:59:59');
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries;
  }, [activityFeed, actionFilter, userFilter, entityTypeFilter, dateFrom, dateTo]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {formatActionDescription(action)}
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All Entity Types</option>
            {uniqueEntityTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          />
        </div>
      </div>

      {/* Activity Entries */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No activity entries match the current filters.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || Edit;
            const colorClass = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600';
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className="activity-feed-entry"
              >
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{entry.user}</span>
                      <span className="text-sm text-gray-500">{formatActionDescription(entry.action)}</span>
                      <span className="text-sm font-medium text-[#5B2D8E]">{entry.entityName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{formatRelativeTime(entry.timestamp)}</span>
                      <span className="text-xs text-gray-400 capitalize">{entry.entityType}</span>
                      <span className="text-xs text-gray-400">{entry.ipAddress}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && entry.details && (
                  <div className="px-4 pb-3 pl-15">
                    <div className="bg-gray-50 rounded-md p-3 ml-11">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-2">Change Details</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Before</div>
                          <div className="bg-red-50 border border-red-100 rounded p-2">
                            {Object.entries(entry.details.before || {}).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-500">{key}:</span>{' '}
                                <span className="text-red-700 line-through">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">After</div>
                          <div className="bg-green-50 border border-green-100 rounded p-2">
                            {Object.entries(entry.details.after || {}).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-500">{key}:</span>{' '}
                                <span className="text-green-700 font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes activityFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .activity-feed-entry {
          animation: activityFadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
