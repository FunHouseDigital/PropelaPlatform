import { useNavigate } from 'react-router-dom';
import { Flag, CheckCircle } from 'lucide-react';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function RedFlags({ flaggedNurses }) {
  const navigate = useNavigate();

  const handleNurseClick = (nurseId) => {
    navigate('/nurses', { state: { openNurseId: nurseId } });
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Flag size={16} className="text-red-500" />
        Red Flags
      </h3>

      {flaggedNurses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <CheckCircle size={24} className="text-green-500" />
          <p className="mt-2 text-sm text-green-600">No active flags.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {flaggedNurses.map((nurse) => {
            const flagCount =
              (nurse.notesFlags || '').split('[FLAG]').length - 1 || nurse.flags || 0;
            const lastContactedDays = daysSince(nurse.lastContacted);
            const initials = nurse.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);

            return (
              <button
                key={nurse.id}
                onClick={() => handleNurseClick(nurse.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#5B2D8E] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {nurse.fullName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {nurse.notesFlags || `${flagCount} flag(s)`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
                    <Flag size={10} />
                    {flagCount}
                  </span>
                  {lastContactedDays !== null && (
                    <span className="text-xs text-gray-400">{lastContactedDays}d</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
