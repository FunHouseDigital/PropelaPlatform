"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Nurse } from "@/types/nurse";
import { getReadinessColor, getNextActionColor } from "@/lib/nurse-utils";

interface KanbanCardProps {
  nurse: Nurse;
  index: number;
}

export function KanbanCard({ nurse, index }: KanbanCardProps) {
  const initials = nurse.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Draggable draggableId={`nurse-${nurse.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as React.CSSProperties}
          className={`rounded-lg border bg-white p-2 shadow-sm transition-shadow ${
            snapshot.isDragging ? "shadow-md ring-2 ring-propela-purple/30" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Initials avatar */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-propela-purple text-xs font-semibold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              {/* Name */}
              <p className="truncate text-sm font-medium text-gray-900">
                {nurse.preferredName || nurse.fullName}
              </p>

              {/* Next Action badge */}
              {nurse.nextAction && (
                <span
                  className={`mt-1 inline-block truncate rounded px-1.5 py-0.5 text-xs font-medium ${getNextActionColor(nurse.nextAction)}`}
                >
                  {nurse.nextAction}
                </span>
              )}

              {/* Bottom row: readiness + specialty */}
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${getReadinessColor(nurse.readinessStatus)}`}
                >
                  {nurse.readinessStatus}
                </span>
              </div>

              {nurse.primaryClinicalSpecialty && (
                <p className="mt-0.5 truncate text-[11px] text-gray-500">
                  {nurse.primaryClinicalSpecialty}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
