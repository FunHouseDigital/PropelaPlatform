import { useState } from 'react';
import { Flag, GripVertical } from 'lucide-react';
import { PIPELINE_STAGES } from '../../lib/constants';
import { calculateReadinessStatus } from '../../lib/calculations';

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

function getReadinessColor(status) {
  switch (status) {
    case 'Placement Ready':
      return 'bg-green-100 text-green-700';
    case 'Placed':
      return 'bg-blue-100 text-blue-700';
    case 'Dropped Out':
      return 'bg-red-100 text-red-700';
    case 'Deferred':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function KanbanCard({ nurse, onNurseClick, onDragStart }) {
  const initials = nurse.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nurse)}
      onClick={() => onNurseClick(nurse)}
      className={`bg-white rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition-shadow ${
        nurse.pipelineStage === 'Dropped Out'
          ? 'border-red-200 bg-red-50'
          : nurse.pipelineStage === 'Deferred'
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <GripVertical size={12} className="text-gray-300 shrink-0" />
        {nurse.photoURL ? (
          <img
            src={nurse.photoURL}
            alt={nurse.fullName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-propela-purple flex items-center justify-center text-white text-xs font-medium shrink-0">
            {initials}
          </div>
        )}
        <span className="text-xs font-medium text-gray-800 truncate flex-1">
          {nurse.fullName}
        </span>
        {nurse.flags > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-red-500 shrink-0">
            <Flag size={10} className="fill-red-500" />
            {nurse.flags}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getNextActionColor(nurse)}`}>
          {(nurse.nextAction || 'No action').replace('Needs: ', '')}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getReadinessColor(nurse.readinessStatus)}`}>
          {nurse.readinessStatus}
        </span>
      </div>
    </div>
  );
}

export default function PipelineView({ nurses, onNurseClick, onUpdateNurse }) {
  const [draggedNurse, setDraggedNurse] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const nursesByStage = {};
  PIPELINE_STAGES.forEach((stage) => {
    nursesByStage[stage] = [];
  });
  nurses.forEach((nurse) => {
    if (nursesByStage[nurse.pipelineStage]) {
      nursesByStage[nurse.pipelineStage].push(nurse);
    }
  });

  const handleDragStart = (e, nurse) => {
    setDraggedNurse(nurse);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nurse.id);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedNurse && draggedNurse.pipelineStage !== targetStage) {
      const updated = {
        ...draggedNurse,
        pipelineStage: targetStage,
        readinessStatus: calculateReadinessStatus(targetStage),
      };
      onUpdateNurse(updated);
    }
    setDraggedNurse(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {PIPELINE_STAGES.map((stage) => {
        const stageNurses = nursesByStage[stage] || [];
        const isDragOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className={`shrink-0 w-56 flex flex-col rounded-lg border ${
              isDragOver ? 'border-propela-purple bg-propela-purple-light/50' : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className="px-3 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 truncate" title={stage}>
                  {stage}
                </h4>
                <span className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                  {stageNurses.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(60vh-3rem)]">
              {stageNurses.map((nurse) => (
                <KanbanCard
                  key={nurse.id}
                  nurse={nurse}
                  onNurseClick={onNurseClick}
                  onDragStart={handleDragStart}
                />
              ))}
              {stageNurses.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
