import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useAppContext } from '../../context/AppContext';
import { PLACEMENT_PIPELINE_COLUMNS } from '../../lib/constants';
import PlacementCard from './PlacementCard';
import PlacementDetailView from './PlacementDetailView';

function DroppableColumn({ id, title, placements, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[240px] flex flex-col rounded-lg border transition-colors ${
        isOver ? 'border-[#5B2D8E]/40 bg-[#5B2D8E]/5' : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 truncate">{title}</h3>
          <span className="text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
            {placements.length}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext
          items={placements.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {placements.map((placement) => (
            <PlacementCard
              key={placement.id}
              placement={placement}
              onClick={() => onCardClick(placement)}
            />
          ))}
        </SortableContext>
        {placements.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No placements</p>
        )}
      </div>
    </div>
  );
}

export default function PlacementPipelineBoard() {
  const { placements, updatePlacements } = useAppContext();
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Group placements by stage
  const columnData = PLACEMENT_PIPELINE_COLUMNS.map((stage) => ({
    id: stage,
    title: stage,
    placements: placements.filter((p) => p.currentStage === stage),
  }));

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activePlacement = placements.find((p) => p.id === active.id);
    if (!activePlacement) return;

    // Determine the target column
    let targetStage = null;

    // Check if dropped over a column directly
    if (PLACEMENT_PIPELINE_COLUMNS.includes(over.id)) {
      targetStage = over.id;
    } else {
      // Dropped over another card - find which column that card is in
      const overPlacement = placements.find((p) => p.id === over.id);
      if (overPlacement) {
        targetStage = overPlacement.currentStage;
      }
    }

    if (!targetStage || targetStage === activePlacement.currentStage) return;

    // Update the placement
    const updatedPlacements = placements.map((p) => {
      if (p.id === active.id) {
        const newHistory = [
          ...p.stageHistory,
          { stage: targetStage, enteredAt: new Date().toISOString().split('T')[0] },
        ];
        return {
          ...p,
          currentStage: targetStage,
          daysInStage: 0,
          stageHistory: newHistory,
        };
      }
      return p;
    });

    updatePlacements(updatedPlacements);
  }

  const activePlacement = activeId
    ? placements.find((p) => p.id === activeId)
    : null;

  return (
    <div>
      {/* Pipeline Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{placements.length}</span> total placements
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-green-600">
            {placements.filter((p) => p.currentStage === 'Placed' || p.currentStage === 'Settled').length}
          </span>{' '}
          successfully placed
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columnData.map((col) => (
            <DroppableColumn
              key={col.id}
              id={col.id}
              title={col.title}
              placements={col.placements}
              onCardClick={setSelectedPlacement}
            />
          ))}
        </div>

        <DragOverlay>
          {activePlacement ? (
            <div className="bg-white border border-[#5B2D8E]/30 rounded-lg p-3 shadow-lg rotate-2 w-[240px]">
              <p className="text-sm font-medium text-gray-900">{activePlacement.nurseName}</p>
              <p className="text-xs text-gray-500">{activePlacement.specialty}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Slide-Out */}
      {selectedPlacement && (
        <PlacementDetailView
          placement={selectedPlacement}
          onClose={() => setSelectedPlacement(null)}
          onUpdate={(updated) => {
            const updatedPlacements = placements.map((p) =>
              p.id === updated.id ? updated : p
            );
            updatePlacements(updatedPlacements);
            setSelectedPlacement(updated);
          }}
        />
      )}
    </div>
  );
}
