import { Flag } from 'lucide-react';

function getNextActionColor(nurse) {
  if (!nurse.nextAction || nurse.nextAction === 'No action required') {
    return 'bg-gray-100 text-gray-500';
  }
  if (nurse.nextActionDueDate) {
    const due = new Date(nurse.nextActionDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'bg-red-100 text-red-700';
    if (due.getTime() === today.getTime()) return 'bg-amber-100 text-amber-700';
  }
  return 'bg-teal-100 text-teal-700';
}

function getPipelineColor(stage) {
  if (['OET Passed', 'Placement Ready', 'Placed'].includes(stage)) return 'bg-green-100 text-green-700';
  if (['Training Active', 'OET Registered'].includes(stage)) return 'bg-blue-100 text-blue-700';
  if (['Cohort Confirmed', 'Selected for Cohort'].includes(stage)) return 'bg-propela-purple-light text-propela-purple';
  if (['Dropped Out'].includes(stage)) return 'bg-red-100 text-red-700';
  if (['Deferred'].includes(stage)) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

function getOetSubScoreClass(score) {
  if (!score && score !== 0) return 'text-gray-400';
  const num = typeof score === 'string' ? parseInt(score, 10) : score;
  if (num >= 350) return 'text-green-600 font-medium';
  return 'text-red-500 font-medium';
}

function getCommitmentColor(status) {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-700';
    case 'Overdue':
      return 'bg-red-100 text-red-700';
    case 'Invoiced':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

function getOetStatusColor(status) {
  switch (status) {
    case 'Passed':
      return 'bg-green-100 text-green-700';
    case 'Failed':
      return 'bg-red-100 text-red-700';
    case 'Registered':
    case 'Sat':
      return 'bg-blue-100 text-blue-700';
    case 'Studying':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

export default function CohortView({ nurses, selectedCohort, onCohortChange, onNurseClick, cohorts }) {
  const filteredNurses = selectedCohort === 'All'
    ? nurses.filter((n) => n.cohortAssigned)
    : nurses.filter((n) => n.cohortAssigned === selectedCohort);

  return (
    <div>
      {/* Cohort Selector */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">Cohort:</label>
        <select
          value={selectedCohort}
          onChange={(e) => onCohortChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
        >
          <option value="All">All Cohorts</option>
          {cohorts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-2">
          {filteredNurses.length} nurse{filteredNurses.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nurse
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Next Action
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  OET Status
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  W
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  S
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  L
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  R
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fee
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Signed
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Flags
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredNurses.map((nurse) => {
                const initials = nurse.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2);
                const naColor = getNextActionColor(nurse);
                const oetScores = nurse.oetScores || {};

                return (
                  <tr
                    key={nurse.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                      nurse.pipelineStage === 'Dropped Out' ? 'bg-red-50/50' : ''
                    }`}
                    onClick={() => onNurseClick(nurse)}
                  >
                    {/* Name */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {nurse.photoURL ? (
                          <img src={nurse.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-propela-purple flex items-center justify-center text-white text-xs font-medium shrink-0">
                            {initials}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 truncate max-w-[140px]">
                          {nurse.fullName}
                        </span>
                      </div>
                    </td>

                    {/* Pipeline Stage */}
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPipelineColor(nurse.pipelineStage)}`}>
                        {nurse.pipelineStage}
                      </span>
                    </td>

                    {/* Next Action */}
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${naColor}`}>
                        {(nurse.nextAction || '-').replace('Needs: ', '')}
                      </span>
                    </td>

                    {/* OET Status */}
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOetStatusColor(nurse.oetStatus)}`}>
                        {nurse.oetStatus}
                      </span>
                    </td>

                    {/* OET Scores */}
                    <td className={`px-3 py-2.5 text-center text-xs ${getOetSubScoreClass(oetScores.writing)}`}>
                      {oetScores.writing || '-'}
                    </td>
                    <td className={`px-3 py-2.5 text-center text-xs ${getOetSubScoreClass(oetScores.speaking)}`}>
                      {oetScores.speaking || '-'}
                    </td>
                    <td className={`px-3 py-2.5 text-center text-xs ${getOetSubScoreClass(oetScores.listening)}`}>
                      {oetScores.listening || '-'}
                    </td>
                    <td className={`px-3 py-2.5 text-center text-xs ${getOetSubScoreClass(oetScores.reading)}`}>
                      {oetScores.reading || '-'}
                    </td>

                    {/* Commitment Fee */}
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCommitmentColor(nurse.commitmentFeeStatus)}`}>
                        {nurse.commitmentFeeStatus}
                      </span>
                    </td>

                    {/* Agreement Signed */}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={nurse.agreementSigned || false}
                        readOnly
                        className="w-3.5 h-3.5 rounded border-gray-300 text-propela-purple"
                      />
                    </td>

                    {/* Flags */}
                    <td className="px-3 py-2.5 text-center">
                      {nurse.flags > 0 ? (
                        <span className="flex items-center justify-center gap-0.5 text-xs text-red-500">
                          <Flag size={11} className="fill-red-500" />
                          {nurse.flags}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>

                    {/* Last Contacted */}
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {nurse.lastContacted || '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredNurses.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-400 text-sm">
                    No nurses in this cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
