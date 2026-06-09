import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, CheckCircle2, XCircle } from 'lucide-react'
import { getCohorts } from '../../data/store.js'
import { getNextActionColour, getFlagCount } from '../../utils/calculations.js'
import Badge from '../shared/Badge.jsx'
import { NurseAvatar, getReadinessVariant } from './GalleryView.jsx'

function OetScoreCell({ score, passThreshold = 350 }) {
  if (score === null || score === undefined || score === '') return <span className="text-grey">-</span>
  const num = Number(score)
  const passed = num >= passThreshold
  return (
    <span className={`text-xs font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
      {score}
    </span>
  )
}

function CommitmentFeeBadge({ status }) {
  if (!status) return <span className="text-xs text-grey">-</span>
  const variantMap = {
    'Paid': 'green',
    'Invoiced': 'amber',
    'Overdue': 'red',
    'Not Due': 'grey',
    'Refunded': 'grey',
    'Waived': 'grey',
  }
  return <Badge variant={variantMap[status] || 'grey'} size="sm">{status}</Badge>
}

export default function CohortView({ nurses, onFilterChange, filters }) {
  const navigate = useNavigate()
  const cohorts = getCohorts()
  const selectedCohort = filters.cohort || 'Cohort 1'

  const cohortNurses = nurses.filter(n => n.cohortAssigned === selectedCohort)

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={selectedCohort}
          onChange={(e) => onFilterChange({ ...filters, cohort: e.target.value })}
          className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple/20"
        >
          {cohorts.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <span className="ml-3 text-sm text-grey">{cohortNurses.length} nurses</span>
      </div>

      <div className="overflow-x-auto bg-white border border-border rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-grey">Nurse</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Stage</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Next Action</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">OET Status</th>
              <th className="px-2 py-3 text-xs font-semibold text-grey">W</th>
              <th className="px-2 py-3 text-xs font-semibold text-grey">S</th>
              <th className="px-2 py-3 text-xs font-semibold text-grey">L</th>
              <th className="px-2 py-3 text-xs font-semibold text-grey">R</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Fee</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Agreement</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Flags</th>
              <th className="px-3 py-3 text-xs font-semibold text-grey">Last Contacted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cohortNurses.map(nurse => {
              const actionColour = getNextActionColour(nurse.nextAction, nurse.followUpDate)
              const flagCount = getFlagCount(nurse.notes)

              return (
                <tr
                  key={nurse.id}
                  onClick={() => navigate(`/nurses/${nurse.id}`)}
                  className="hover:bg-purple-light/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <NurseAvatar nurse={nurse} size={28} />
                      <span className="text-xs font-medium text-dark">{nurse.fullName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={getReadinessVariant(nurse.readinessStatus || 'Not Ready')} size="sm">
                      {nurse.pipelineStage}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {nurse.nextAction && nurse.nextAction !== 'No action required' ? (
                      <Badge bgColor={actionColour.bg} textColor={actionColour.text} size="sm">
                        {nurse.nextAction.length > 20 ? nurse.nextAction.slice(0, 20) + '...' : nurse.nextAction}
                      </Badge>
                    ) : (
                      <span className="text-xs text-grey">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-dark">{nurse.oetStatus || '-'}</span>
                  </td>
                  <td className="px-2 py-3"><OetScoreCell score={nurse.oetWritingScore} /></td>
                  <td className="px-2 py-3"><OetScoreCell score={nurse.oetSpeakingScore} /></td>
                  <td className="px-2 py-3"><OetScoreCell score={nurse.oetListeningScore} /></td>
                  <td className="px-2 py-3"><OetScoreCell score={nurse.oetReadingScore} /></td>
                  <td className="px-3 py-3"><CommitmentFeeBadge status={nurse.commitmentFeeStatus} /></td>
                  <td className="px-3 py-3">
                    {nurse.agreementSigned ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {flagCount > 0 ? (
                      <div className="flex items-center gap-1 text-red">
                        <Flag className="w-3.5 h-3.5 fill-red" />
                        <span className="text-xs font-medium">{flagCount}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-grey">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-grey">{formatDate(nurse.lastContacted)}</span>
                  </td>
                </tr>
              )
            })}
            {cohortNurses.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-grey text-sm">
                  No nurses assigned to {selectedCohort}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
