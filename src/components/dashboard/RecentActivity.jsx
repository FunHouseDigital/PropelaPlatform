import { MessageSquare, Phone, Mail, Users, FileText, Activity } from 'lucide-react';

function getIcon(type) {
  switch (type) {
    case 'WhatsApp':
      return <MessageSquare size={14} className="text-green-500" />;
    case 'Phone':
    case 'Call':
      return <Phone size={14} className="text-blue-500" />;
    case 'Email':
      return <Mail size={14} className="text-amber-500" />;
    case 'In-person':
    case 'Meeting':
      return <Users size={14} className="text-purple-500" />;
    case 'Note':
      return <FileText size={14} className="text-gray-500" />;
    default:
      return <Activity size={14} className="text-gray-400" />;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function RecentActivity({ activities }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Activity size={16} className="text-gray-400" />
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Activity size={24} />
          <p className="mt-2 text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {activities.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
            >
              <div className="mt-0.5">{getIcon(entry.channel)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">
                  <span className="font-medium">{entry.nurseName}</span>
                  {entry.summary && (
                    <span className="text-gray-500"> - {entry.summary}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {entry.channel} {entry.date && `| ${formatDate(entry.date)}`}
                </p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatDate(entry.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
