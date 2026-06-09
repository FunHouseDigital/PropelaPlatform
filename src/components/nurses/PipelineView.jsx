import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { PIPELINE_STAGES } from '../../data/constants.js'
import { getNextActionColour, getFlagCount, calculateReadinessStatus } from '../../utils/calculations.js'
import Badge from '../shared/Badge.jsx'
import { NurseAvatar, getReadinessVariant } from './GalleryView.jsx'

function KanbanCard({ nurse }) {
  const navigate = useNavigate()
  const actionColour = getNextActionColour(nurse.nextAction, nurse.followUpDate)
  const flagCount = getFlagCount(nurse.notes)
  const readinessStatus = nurse.readinessStatus || 'Not Ready'

  const handleDragStart = (e) => {
    e.dataTransfer.setData('nurseId', nurse.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => navigate(`/nurses/${nurse.id}`)}
      className="bg-white border border-border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-2">
        <NurseAvatar nurse={nurse} size={32} />
        <span className="text-xs font-medium text-dark truncate flex-1">{nurse.fullName}</span>
        {flagCount > 0 && (
          <div className="flex items-center gap-0.5 text-red">
            <Flag className="w-3 h-3 fill-red" />
            <span className="text-[10px] font-medium">{flagCount}</span>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {nurse.nextAction && nurse.nextAction !== 'No action required' && (
          <Badge bgColor={actionColour.bg} textColor={actionColour.text} size="sm">
            {nurse.nextAction.length > 25 ? nurse.nextAction.slice(0, 25) + '...' : nurse.nextAction}
          </Badge>
        )}
        <Badge variant={getReadinessVariant(readinessStatus)} size="sm">
          {readinessStatus}
        </Badge>
      </div>
    </div>
  )
}

export default function PipelineView({ nurses, onUpdateNurse }) {
  const [dragOverStage, setDragOverStage] = useState(null)

  const nursesByStage = {}
  PIPELINE_STAGES.forEach(stage => {
    nursesByStage[stage.value] = []
  })
  nurses.forEach(nurse => {
    const stage = nurse.pipelineStage
    if (nursesByStage[stage]) {
      nursesByStage[stage].push(nurse)
    } else {
      // If stage not found, put in Applied
      if (nursesByStage['Applied']) {
        nursesByStage['Applied'].push(nurse)
      }
    }
  })

  const handleDragOver = (e, stageValue) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageValue)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = (e, stageValue) => {
    e.preventDefault()
    setDragOverStage(null)
    const nurseId = e.dataTransfer.getData('nurseId')
    if (nurseId) {
      const newReadiness = calculateReadinessStatus(stageValue)
      onUpdateNurse(nurseId, {
        pipelineStage: stageValue,
        readinessStatus: newReadiness,
      })
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {PIPELINE_STAGES.map(stage => {
        const stageNurses = nursesByStage[stage.value] || []
        const isDragOver = dragOverStage === stage.value

        return (
          <div
            key={stage.value}
            className={`flex-shrink-0 w-64 rounded-xl border transition-colors ${
              isDragOver ? 'border-purple bg-purple-light/50' : 'border-border bg-gray-50/50'
            }`}
            onDragOver={(e) => handleDragOver(e, stage.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.value)}
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-dark truncate">{stage.label}</h4>
                <span className="text-[10px] bg-gray-200 text-grey rounded-full px-1.5 py-0.5 font-medium">
                  {stageNurses.length}
                </span>
              </div>
              <span className="text-[10px] text-grey">{stage.category}</span>
            </div>

            <div className="p-2 space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto">
              {stageNurses.map(nurse => (
                <KanbanCard key={nurse.id} nurse={nurse} />
              ))}
              {stageNurses.length === 0 && (
                <p className="text-[10px] text-grey text-center py-4">No nurses</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
