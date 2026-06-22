import { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Mail,
  MailOpen,
  AlertTriangle,
  Info,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'system_alert', label: 'System Alerts' },
  { id: 'task_update', label: 'Task Updates' },
  { id: 'document_expiry', label: 'Document Expiry' },
  { id: 'placement_match', label: 'Placement Matches' },
  { id: 'compliance_warning', label: 'Compliance Warnings' },
];

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_COLORS = {
  info: 'text-blue-500 bg-blue-50',
  warning: 'text-amber-500 bg-amber-50',
  critical: 'text-red-500 bg-red-50',
};

function getDateGroup(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && date.getDate() === now.getDate()) return 'Today';
  if (diffDays <= 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
      return 'Yesterday';
    }
  }
  if (diffDays <= 7) return 'This Week';
  return 'Older';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationInbox() {
  const { notificationAlerts, updateNotificationAlerts } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filteredNotifications = useMemo(() => {
    let items = [...notificationAlerts];
    if (selectedCategory !== 'all') {
      items = items.filter((n) => n.category === selectedCategory);
    }
    if (showUnreadOnly) {
      items = items.filter((n) => !n.read);
    }
    return items;
  }, [notificationAlerts, selectedCategory, showUnreadOnly]);

  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
    filteredNotifications.forEach((n) => {
      const group = getDateGroup(n.timestamp);
      if (groups[group]) {
        groups[group].push(n);
      } else {
        groups['Older'].push(n);
      }
    });
    return groups;
  }, [filteredNotifications]);

  const unreadCount = notificationAlerts.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    const updated = notificationAlerts.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotificationAlerts(updated);
  };

  const handleMarkAsUnread = (id) => {
    const updated = notificationAlerts.map((n) => (n.id === id ? { ...n, read: false } : n));
    updateNotificationAlerts(updated);
  };

  const handleToggleRead = (id) => {
    const notification = notificationAlerts.find((n) => n.id === id);
    if (notification?.read) {
      handleMarkAsUnread(id);
    } else {
      handleMarkAsRead(id);
    }
  };

  const handleMarkAllRead = () => {
    const updated = notificationAlerts.map((n) => ({ ...n, read: true }));
    updateNotificationAlerts(updated);
  };

  const handleDelete = (id) => {
    const updated = notificationAlerts.filter((n) => n.id !== id);
    updateNotificationAlerts(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Notification Inbox</h2>
          {unreadCount > 0 && (
            <span className="bg-[#5B2D8E] text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showUnreadOnly
                ? 'bg-[#5B2D8E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter size={14} />
            Unread Only
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <CheckCheck size={14} />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#5B2D8E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notification groups */}
      <div className="space-y-4">
        {Object.entries(groupedNotifications).map(([groupLabel, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={groupLabel}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {groupLabel}
                </h3>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>
              <div className="space-y-1">
                {items.map((notification) => {
                  const SeverityIcon = SEVERITY_ICONS[notification.severity] || Info;
                  const severityColor = SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.info;

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        notification.read
                          ? 'bg-white border-gray-100'
                          : 'bg-purple-50/30 border-purple-100'
                      }`}
                    >
                      {/* Severity icon */}
                      <div className={`p-1.5 rounded-md ${severityColor}`}>
                        <SeverityIcon size={16} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm ${
                              notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {notification.categoryLabel}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            notification.severity === 'critical'
                              ? 'text-red-600 bg-red-50'
                              : notification.severity === 'warning'
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-blue-600 bg-blue-50'
                          }`}>
                            {notification.severity}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleRead(notification.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-[#5B2D8E] hover:bg-purple-50 transition-colors"
                          title={notification.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          {notification.read ? <Mail size={14} /> : <MailOpen size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No notifications to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
