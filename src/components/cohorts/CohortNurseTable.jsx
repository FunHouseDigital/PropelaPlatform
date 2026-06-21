import { useState } from 'react';
import { Flag, ChevronUp, ChevronDown } from 'lucide-react';
import { getNurses, saveNurses } from '../../lib/storage';
import { PIPELINE_STAGES, OET_STATUSES, COMMITMENT_FEE_STATUSES, NEXT_ACTION_VALUES } from '../../lib/constants';

function getPipelineColor(stage) {
  if (['OET Passed', 'Placement Ready', 'Placed'].includes(stage)) return 'bg-green-100 text-green-700';
  if (['Training Active', 'OET Registered'].includes(stage)) return 'bg-blue-100 text-blue-700';
  if (['Cohort Confirmed', 'Selected for Cohort'].includes(stage)) return 'bg-propela-purple-light text-propela-purple';
  if (['Dropped Out'].includes(stage)) return 'bg-red-100 text-red-700';
  if (['Deferred'].includes(stage)) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

function getOetStatusColor(status) {
  switch (status) {
    case 'Passed': return 'bg-green-100 text-green-700';
    case 'Failed': return 'bg-red-100 text-red-700';
    case 'Registered':
    case 'Sat': return 'bg-blue-100 text-blue-700';
    case 'Studying': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function getCommitmentColor(status) {
  switch (status) {
    case 'Paid': return 'bg-green-100 text-green-700';
    case 'Overdue': return 'bg-red-100 text-red-700';
    case 'Invoiced': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function getOetSubScoreClass(score) {
  if (!score && score !== 0) return 'text-gray-400';
  const num = typeof score === 'string' ? parseInt(score, 10) : score;
  if (num >= 350) return 'text-green-600 font-medium';
  return 'text-red-500 font-medium';
}

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

export default function CohortNurseTable({ cohortName, onNurseUpdate }) {
  const [nurses, setNurses] = useState(() => {
    const all = getNurses();
    return all.filter((n) => n.cohortAssigned === cohortName);
  });
  const [editingCell, setEditingCell] = useState(null);
  const [sortField, setSortField] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  const sortedNurses = [...nurses].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    return aVal.toString().localeCompare(bVal.toString()) * dir;
  });

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function updateNurseField(nurseId, field, value) {
    const allNurses = getNurses();
    const idx = allNurses.findIndex((n) => n.id === nurseId);
    if (idx === -1) return;
    allNurses[idx] = { ...allNurses[idx], [field]: value };
    saveNurses(allNurses);

    // Update local state
    setNurses((prev) =>
      prev.map((n) => (n.id === nurseId ? { ...n, [field]: value } : n))
    );
    setEditingCell(null);
    if (onNurseUpdate) onNurseUpdate();
  }

  function renderSortIcon(field) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  if (nurses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No nurses assigned to this cohort yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th onClick={() => handleSort('fullName')} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
              <span className="flex items-center gap-1">Nurse {renderSortIcon('fullName')}</span>
            </th>
            <th onClick={() => handleSort('pipelineStage')} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
              <span className="flex items-center gap-1">Stage {renderSortIcon('pipelineStage')}</span>
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Next Action
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              OET Status
            </th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">W</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">S</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">L</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">R</th>
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
          {sortedNurses.map((nurse) => {
            const initials = nurse.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);
            const oetScores = nurse.oetScores || {};

            return (
              <tr key={nurse.id} className={`border-b border-gray-50 hover:bg-gray-50 ${nurse.pipelineStage === 'Dropped Out' ? 'bg-red-50/50' : ''}`}>
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

                {/* Pipeline Stage - editable */}
                <td className="px-3 py-2.5">
                  {editingCell === `${nurse.id}-stage` ? (
                    <select
                      value={nurse.pipelineStage}
                      onChange={(e) => updateNurseField(nurse.id, 'pipelineStage', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${nurse.id}-stage`)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${getPipelineColor(nurse.pipelineStage)}`}
                    >
                      {nurse.pipelineStage}
                    </span>
                  )}
                </td>

                {/* Next Action - editable */}
                <td className="px-3 py-2.5">
                  {editingCell === `${nurse.id}-action` ? (
                    <select
                      value={nurse.nextAction || ''}
                      onChange={(e) => updateNurseField(nurse.id, 'nextAction', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-propela-purple max-w-[180px]"
                    >
                      {NEXT_ACTION_VALUES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${nurse.id}-action`)}
                      className={`text-xs px-2 py-0.5 rounded font-medium cursor-pointer ${getNextActionColor(nurse)}`}
                    >
                      {(nurse.nextAction || '-').replace('Needs: ', '')}
                    </span>
                  )}
                </td>

                {/* OET Status - editable */}
                <td className="px-3 py-2.5">
                  {editingCell === `${nurse.id}-oet` ? (
                    <select
                      value={nurse.oetStatus || ''}
                      onChange={(e) => updateNurseField(nurse.id, 'oetStatus', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    >
                      {OET_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${nurse.id}-oet`)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${getOetStatusColor(nurse.oetStatus)}`}
                    >
                      {nurse.oetStatus || '-'}
                    </span>
                  )}
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

                {/* Commitment Fee - editable */}
                <td className="px-3 py-2.5">
                  {editingCell === `${nurse.id}-fee` ? (
                    <select
                      value={nurse.commitmentFeeStatus || ''}
                      onChange={(e) => updateNurseField(nurse.id, 'commitmentFeeStatus', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    >
                      {COMMITMENT_FEE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${nurse.id}-fee`)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${getCommitmentColor(nurse.commitmentFeeStatus)}`}
                    >
                      {nurse.commitmentFeeStatus || '-'}
                    </span>
                  )}
                </td>

                {/* Agreement Signed */}
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={nurse.agreementSigned || false}
                    onChange={(e) => updateNurseField(nurse.id, 'agreementSigned', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-propela-purple focus:ring-propela-purple cursor-pointer"
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
        </tbody>
      </table>
    </div>
  );
}
