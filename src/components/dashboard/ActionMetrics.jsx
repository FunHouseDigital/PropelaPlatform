import { AlertTriangle, Users, GraduationCap, Building2 } from 'lucide-react';

export default function ActionMetrics({ actionsNeeded, activeNurses, cohortStatus, hubFollowUps }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Actions Needed */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">Actions Needed</p>
          <AlertTriangle
            size={18}
            className={actionsNeeded > 0 ? 'text-red-500' : 'text-green-500'}
          />
        </div>
        <p
          className={`text-5xl font-bold ${
            actionsNeeded > 0 ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {actionsNeeded}
        </p>
        <p className="text-xs text-gray-400 mt-1">Overdue + due today</p>
      </div>

      {/* Active Nurses */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">Active Nurses</p>
          <Users size={18} className="text-[#5B2D8E]" />
        </div>
        <p className="text-4xl font-bold text-[#5B2D8E]">{activeNurses}</p>
        <p className="text-xs text-gray-400 mt-1">In pipeline (excl. exits)</p>
      </div>

      {/* Cohort Status */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">Cohort Status</p>
          <GraduationCap size={18} className="text-[#5B2D8E]" />
        </div>
        <p className="text-lg font-bold text-gray-800">Cohort 1</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E]">
          {cohortStatus}
        </span>
      </div>

      {/* Hub Follow-ups */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">Hub Follow-ups</p>
          <Building2
            size={18}
            className={hubFollowUps > 0 ? 'text-amber-500' : 'text-gray-400'}
          />
        </div>
        <p
          className={`text-4xl font-bold ${
            hubFollowUps > 0 ? 'text-amber-500' : 'text-gray-400'
          }`}
        >
          {hubFollowUps}
        </p>
        <p className="text-xs text-gray-400 mt-1">Due today or overdue</p>
      </div>
    </div>
  );
}
