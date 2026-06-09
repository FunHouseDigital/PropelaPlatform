import { Flag, Calendar, Clock } from 'lucide-react'
import { PIPELINE_STAGES, NEXT_ACTION_OPTIONS } from '../../data/constants.js'
import { getNextActionColour, getFlagCount, calculateReadinessStatus } from '../../utils/calculations.js'
import { NurseAvatar, getReadinessVariant } from './GalleryView.jsx'
import Badge from '../shared/Badge.jsx'

export default function NurseCardHeader({ nurse, onUpdate }) {
  const actionColour = getNextActionColour(nurse.nextAction, nurse.followUpDate)
  const flagCount = getFlagCount(nurse.notes)
  const readinessStatus = nurse.readinessStatus || calculateReadinessStatus(nurse.pipelineStage)

  const handleStageChange = (e) => {
    const newStage = e.target.value
    onUpdate({
      pipelineStage: newStage,
      readinessStatus: calculateReadinessStatus(newStage),
    })
  }

  const handleNextActionChange = (e) => {
    onUpdate({ nextAction: e.target.value })
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="bg-white border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-start gap-5 flex-wrap">
        {/* Photo and name */}
        <div className="flex items-center gap-4">
          <NurseAvatar nurse={nurse} size={64} />
          <div>
            <h1 className="text-xl font-bold text-dark">{nurse.fullName}</h1>
            {nurse.preferredName && (
              <p className="text-sm text-grey">({nurse.preferredName})</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <select
                value={nurse.pipelineStage || ''}
                onChange={handleStageChange}
                className="text-xs border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple"
              >
                {PIPELINE_STAGES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* NEXT ACTION - MOST PROMINENT */}
        <div className="flex-1 flex justify-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-semibold text-grey tracking-wider mb-1">Next Action</span>
            <select
              value={nurse.nextAction || ''}
              onChange={handleNextActionChange}
              className="text-lg font-bold rounded-xl px-5 py-2.5 border-2 cursor-pointer focus:outline-none"
              style={{
                backgroundColor: actionColour.bg,
                color: actionColour.text,
                borderColor: actionColour.text + '40',
              }}
            >
              {NEXT_ACTION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right side badges */}
        <div className="flex flex-col items-end gap-2">
          <Badge variant={getReadinessVariant(readinessStatus)} size="md">
            {readinessStatus}
          </Badge>

          {flagCount > 0 && (
            <div className="flex items-center gap-1 text-red">
              <Flag className="w-4 h-4 fill-red" />
              <span className="text-sm font-semibold">{flagCount} flag{flagCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-grey">
            {nurse.lastContacted && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(nurse.lastContacted)}
              </span>
            )}
            {nurse.cohortAssigned && (
              <Badge variant="purple" size="sm">{nurse.cohortAssigned}</Badge>
            )}
          </div>

          {nurse.submittedAt && (
            <span className="text-[10px] text-grey flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Submitted {formatDate(nurse.submittedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
