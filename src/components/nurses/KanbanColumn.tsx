"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Nurse, PipelineStage } from "@/types/nurse";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  stage: PipelineStage;
  nurses: Nurse[];
  headerClassName?: string;
}

export function KanbanColumn({
  stage,
  nurses,
  headerClassName = "bg-propela-purple-light",
}: KanbanColumnProps) {
  return (
    <div className="flex w-[250px] min-w-[250px] flex-col rounded-lg border bg-gray-50">
      {/* Header */}
      <div
        className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${headerClassName}`}
      >
        <h3 className="truncate text-sm font-bold text-gray-800">{stage}</h3>
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-700">
          {nurses.length}
        </span>
      </div>

      {/* Droppable card area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${
              snapshot.isDraggingOver
                ? "border-2 border-dashed border-propela-purple/40 bg-propela-purple-light/50"
                : ""
            }`}
            style={{ maxHeight: "calc(100vh - 280px)", minHeight: "80px" }}
          >
            {nurses.map((nurse, index) => (
              <KanbanCard key={nurse.id} nurse={nurse} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
