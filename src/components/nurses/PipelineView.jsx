import { AlertTriangle, Flag, GitMerge, GripVertical, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { calculateReadinessStatus } from '../../lib/calculations';
import { PIPELINE_STAGES } from '../../lib/constants';

const PIPELINE_ERROR_TITLES = {
  AUTH: 'Sign in before moving this nurse.',
  FORBIDDEN: 'You do not have permission to move this nurse.',
  NETWORK: 'The pipeline move could not be confirmed because of a network error.',
  STORAGE: 'The pipeline move could not be saved to browser storage.',
  VALIDATION: 'The pipeline move was rejected as invalid.',
  UNKNOWN: 'The pipeline move could not be confirmed.',
};

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

function KanbanCard({ nurse, onNurseClick, onDragStart, onDragEnd, moveBlocked, movePending }) {
  const initials = nurse.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      data-testid={`pipeline-card-${nurse.id}`}
      draggable={!moveBlocked}
      role="button"
      tabIndex={0}
      aria-label={`Open ${nurse.fullName}`}
      aria-disabled={moveBlocked || undefined}
      onDragStart={(event) => onDragStart(event, nurse)}
      onDragEnd={onDragEnd}
      onClick={() => onNurseClick(nurse)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onNurseClick(nurse);
        }
      }}
      className={`rounded-lg border bg-white p-2.5 transition-shadow hover:shadow-sm ${
        moveBlocked ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'
      } ${
        nurse.pipelineStage === 'Dropped Out'
          ? 'border-red-200 bg-red-50'
          : nurse.pipelineStage === 'Deferred'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-gray-100'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        {movePending ? (
          <LoaderCircle size={12} className="shrink-0 animate-spin text-propela-purple" />
        ) : (
          <GripVertical size={12} className="shrink-0 text-gray-300" />
        )}
        {nurse.photoURL ? (
          <img
            src={nurse.photoURL}
            alt={nurse.fullName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-propela-purple text-xs font-medium text-white">
            {initials}
          </div>
        )}
        <span className="flex-1 truncate text-xs font-medium text-gray-800">{nurse.fullName}</span>
        {nurse.flags > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-red-500">
            <Flag size={10} className="fill-red-500" />
            {nurse.flags}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getNextActionColor(nurse)}`}
        >
          {(nurse.nextAction || 'No action').replace('Needs: ', '')}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getReadinessColor(nurse.readinessStatus)}`}
        >
          {nurse.readinessStatus}
        </span>
      </div>
    </div>
  );
}

function PipelineDecision({
  nurse,
  progress,
  onRetryPipeline,
  onReloadPipeline,
  onRebasePipeline,
  canChangePipeline,
}) {
  const decision = progress.decision;
  if (!decision) return null;

  const isConflict = decision.type === 'pipelineConflict';
  const isLoading = progress.state === 'loading';
  const errorMessage =
    progress.error?.message ||
    PIPELINE_ERROR_TITLES[progress.error?.code] ||
    PIPELINE_ERROR_TITLES.UNKNOWN;
  const latest = decision.latest;

  return (
    <div
      role="alert"
      className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {isConflict ? 'Pipeline move conflicted' : 'Pipeline move was not confirmed'}
          </p>
          <p className="mt-0.5 text-xs text-amber-900">
            {isConflict
              ? `${nurse?.fullName || 'This nurse'} changed on the server${
                  latest?.pipelineStage ? ` and is now in ${latest.pipelineStage}` : ''
                }. Reload or rebase to version ${latest?.version ?? 'the latest version'} before moving again.`
              : `${errorMessage} The previous stage and readiness are still displayed.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!isConflict && decision.retryAvailable && canChangePipeline && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onRetryPipeline(nurse.id)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 disabled:opacity-60"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                Retry move
              </button>
            )}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onReloadPipeline(nurse.id)}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 disabled:opacity-60"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Reload from server
            </button>
            {isConflict && canChangePipeline && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onRebasePipeline(nurse.id)}
                className="inline-flex items-center gap-1 rounded-md bg-amber-800 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
              >
                <GitMerge size={12} />
                Rebase on latest
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PipelineView({
  nurses,
  onNurseClick,
  onPipelineChange,
  pipeline = {},
  onRetryPipeline,
  onReloadPipeline,
  onRebasePipeline,
  permissions = { canChangePipeline: true },
}) {
  const canChangePipeline = permissions.canChangePipeline !== false;
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

  const isMoveBlocked = (id) =>
    !canChangePipeline || pipeline[id]?.state === 'loading' || Boolean(pipeline[id]?.decision);

  const handleDragStart = (event, nurse) => {
    if (isMoveBlocked(nurse.id)) {
      event.preventDefault();
      return;
    }
    setDraggedNurse(nurse);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nurse.id);
  };

  const handleDragOver = (event, stage) => {
    if (!canChangePipeline) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedNurse(null);
    setDragOverStage(null);
  };

  const handleDrop = (event, targetStage) => {
    event.preventDefault();
    setDragOverStage(null);
    if (
      canChangePipeline &&
      draggedNurse &&
      !isMoveBlocked(draggedNurse.id) &&
      draggedNurse.pipelineStage !== targetStage
    ) {
      onPipelineChange({
        id: draggedNurse.id,
        baseVersion: draggedNurse.version,
        pipelineStage: targetStage,
        readinessStatus: calculateReadinessStatus(targetStage),
      });
    }
    setDraggedNurse(null);
  };

  const decisions = Object.entries(pipeline).filter(([, progress]) => progress?.decision);

  return (
    <>
      {decisions.map(([id, progress]) => (
        <PipelineDecision
          key={id}
          nurse={nurses.find((nurse) => nurse.id === id) || progress.decision.latest}
          progress={progress}
          onRetryPipeline={onRetryPipeline}
          onReloadPipeline={onReloadPipeline}
          onRebasePipeline={onRebasePipeline}
          canChangePipeline={canChangePipeline}
        />
      ))}

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {PIPELINE_STAGES.map((stage) => {
          const stageNurses = nursesByStage[stage] || [];
          const isDragOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              data-testid={`pipeline-stage-${stage}`}
              className={`flex w-56 shrink-0 flex-col rounded-lg border ${
                isDragOver
                  ? 'border-propela-purple bg-propela-purple-light/50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onDragOver={(event) => handleDragOver(event, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(event) => handleDrop(event, stage)}
            >
              <div className="border-b border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <h4 className="truncate text-xs font-semibold text-gray-700" title={stage}>
                    {stage}
                  </h4>
                  <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-500">
                    {stageNurses.length}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(60vh-3rem)] flex-1 space-y-2 overflow-y-auto p-2">
                {stageNurses.map((nurse) => (
                  <KanbanCard
                    key={nurse.id}
                    nurse={nurse}
                    onNurseClick={onNurseClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    moveBlocked={isMoveBlocked(nurse.id)}
                    movePending={pipeline[nurse.id]?.state === 'loading'}
                  />
                ))}
                {stageNurses.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
