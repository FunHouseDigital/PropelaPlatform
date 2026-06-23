import { useMemo } from 'react';
import { Monitor, Clock, Wifi, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { ACCESSIBLE_CHART_COLORS } from '../../lib/chartAccessibility';

const STATUS_BADGES = {
  active: 'bg-green-100 text-green-700 border-green-200',
  idle: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_DOTS = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  expired: 'bg-gray-400',
};

function calculateDuration(loginTime, lastActivity) {
  const login = new Date(loginTime);
  const last = new Date(lastActivity);
  const diffMs = Math.abs(last - login);
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

function formatDuration(hours, minutes) {
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserSessionTracker() {
  const { userSessions } = useAppContext();

  const stats = useMemo(() => {
    const activeSessions = userSessions.filter((s) => s.status === 'active');
    const idleSessions = userSessions.filter((s) => s.status === 'idle');

    const durations = userSessions.map((s) => calculateDuration(s.loginTime, s.lastActivity).totalMinutes);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgHours = Math.floor(avgDuration / 60);
    const avgMinutes = avgDuration % 60;

    return {
      totalActive: activeSessions.length,
      avgDuration: formatDuration(avgHours, avgMinutes),
      idleCount: idleSessions.length,
    };
  }, [userSessions]);

  const chartData = useMemo(() => {
    return userSessions.map((session) => {
      const duration = calculateDuration(session.loginTime, session.lastActivity);
      return {
        name: session.userName.split(' ')[0],
        duration: duration.totalMinutes,
        status: session.status,
      };
    });
  }, [userSessions]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi size={16} className="text-green-500" />
            <span className="text-sm text-gray-500">Active Sessions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalActive}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-blue-500" />
            <span className="text-sm text-gray-500">Average Duration</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgDuration}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-500">Currently Idle</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.idleCount}</div>
        </div>
      </div>

      {/* Session Timeline Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Session Durations (minutes)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="duration" fill={ACCESSIBLE_CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userSessions.map((session) => {
          const duration = calculateDuration(session.loginTime, session.lastActivity);
          return (
            <div
              key={session.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E] flex items-center justify-center text-sm font-bold">
                  {getInitials(session.userName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{session.userName}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        STATUS_BADGES[session.status] || STATUS_BADGES.expired
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[session.status] || STATUS_DOTS.expired}`} />
                      {session.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{session.role}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Login:</span>{' '}
                      <span className="text-gray-600">{new Date(session.loginTime).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Active:</span>{' '}
                      <span className="text-gray-600">{new Date(session.lastActivity).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>{' '}
                      <span className="text-gray-600">{formatDuration(duration.hours, duration.minutes)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">IP:</span>{' '}
                      <span className="text-gray-600 font-mono">{session.ipAddress}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
