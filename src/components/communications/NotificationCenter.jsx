import { useState, useMemo } from 'react';
import {
  Bell,
  FileText,
  ShieldAlert,
  GitBranch,
  Briefcase,
  Check,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const TYPE_CONFIG = {
  document_expiry: { icon: FileText, color: 'bg-amber-100 text-amber-700', label: 'Document Expiry' },
  compliance_alert: { icon: ShieldAlert, color: 'bg-red-100 text-red-700', label: 'Compliance' },
  pipeline_change: { icon: GitBranch, color: 'bg-blue-100 text-blue-700', label: 'Pipeline' },
  placement_update: { icon: Briefcase, color: 'bg-green-100 text-green-700', label: 'Placement' },
};

const PRIORITY_COLORS = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-white border-gray-200',
};

export default function NotificationCenter() {
  const { notifications, nurses, updateNotifications } = useAppContext();
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  const nurseMap = useMemo(() => {
    const map = {};
    nurses.forEach((n) => {
      map[n.id] = n.fullName;
    });
    return map;
  }, [nurses]);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (typeFilter !== 'all') {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    if (readFilter === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (readFilter === 'read') {
      filtered = filtered.filter((n) => n.read);
    }

    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filtered;
  }, [notifications, typeFilter, readFilter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function toggleRead(notifId) {
    const updated = notifications.map((n) =>
      n.id === notifId ? { ...n, read: !n.read } : n
    );
    updateNotifications(updated);
  }

  function markAllAsRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  }

  function getRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return (
    <div>
      {/* Header with actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#5B2D8E]" />
          <span className="text-sm font-medium text-gray-700">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All Types</option>
            <option value="document_expiry">Document Expiry</option>
            <option value="compliance_alert">Compliance</option>
            <option value="pipeline_change">Pipeline</option>
            <option value="placement_update">Placement</option>
          </select>

          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#5B2D8E] hover:bg-[#5B2D8E]/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filteredNotifications.map((notif) => {
          const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.document_expiry;
          const Icon = config.icon;
          const priorityColor = PRIORITY_COLORS[notif.priority] || PRIORITY_COLORS.low;

          return (
            <div
              key={notif.id}
              className={`border rounded-lg p-4 transition-all ${priorityColor} ${
                !notif.read ? 'border-l-4 border-l-[#5B2D8E]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {notif.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                      {config.label}
                    </span>
                    {notif.priority === 'high' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        High Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{notif.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                      {getRelativeTime(notif.timestamp)}
                    </span>
                    {notif.nurseId && (
                      <span className="text-xs text-gray-400">
                        {nurseMap[notif.nurseId] || notif.nurseId}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleRead(notif.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title={notif.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {notif.read ? (
                    <Check size={16} className="text-gray-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-[#5B2D8E]" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-50" />
          <p>No notifications to display</p>
        </div>
      )}
    </div>
  );
}
