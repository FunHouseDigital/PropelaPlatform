import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CalendarClock } from 'lucide-react';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  return diff;
}

function NurseRow({ nurse, colorClass, onClick }) {
  const initials = nurse.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const lastContactedDays = daysSince(nurse.lastContacted);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-[#5B2D8E] flex items-center justify-center flex-shrink-0">
        {nurse.photoURL ? (
          <img
            src={nurse.photoURL}
            alt={nurse.fullName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="text-white text-xs font-medium">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{nurse.fullName}</p>
        <p className="text-xs text-gray-500 truncate">{nurse.nextAction}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {lastContactedDays !== null && (
          <p className={`text-xs ${colorClass}`}>
            {lastContactedDays}d ago
          </p>
        )}
      </div>
    </button>
  );
}

export default function ActionsPanel({ overdueNurses, dueTodayNurses, upcomingNurses }) {
  const navigate = useNavigate();

  const handleNurseClick = (nurseId) => {
    navigate('/nurses', { state: { openNurseId: nurseId } });
  };

  const hasActions = overdueNurses.length > 0 || dueTodayNurses.length > 0 || upcomingNurses.length > 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-gray-400" />
        Nurses needing action
      </h3>

      {!hasActions && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Clock size={24} />
          <p className="mt-2 text-sm">All caught up!</p>
        </div>
      )}

      <div className="space-y-3 max-h-[320px] overflow-y-auto">
        {overdueNurses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={12} className="text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase">
                Overdue ({overdueNurses.length})
              </span>
            </div>
            {overdueNurses.map((nurse) => (
              <NurseRow
                key={nurse.id}
                nurse={nurse}
                colorClass="text-red-500"
                onClick={() => handleNurseClick(nurse.id)}
              />
            ))}
          </div>
        )}

        {dueTodayNurses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-500 uppercase">
                Due Today ({dueTodayNurses.length})
              </span>
            </div>
            {dueTodayNurses.map((nurse) => (
              <NurseRow
                key={nurse.id}
                nurse={nurse}
                colorClass="text-amber-500"
                onClick={() => handleNurseClick(nurse.id)}
              />
            ))}
          </div>
        )}

        {upcomingNurses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase">
                Upcoming ({upcomingNurses.length})
              </span>
            </div>
            {upcomingNurses.map((nurse) => (
              <NurseRow
                key={nurse.id}
                nurse={nurse}
                colorClass="text-gray-400"
                onClick={() => handleNurseClick(nurse.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
