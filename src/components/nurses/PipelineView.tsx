"use client";

import { useState, useCallback, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Nurse, PipelineStage } from "@/types/nurse";
import { getReadinessFromStage } from "@/lib/nurse-utils";
import { updateNursePipelineStage } from "@/app/nurses/actions";
import { KanbanColumn } from "./KanbanColumn";

const APPLICATION_FUNNEL: PipelineStage[] = [
  "Applied",
  "CV Submitted",
  "CV + English Submitted",
  "Under Review",
  "Shortlisted -- Yes",
  "Shortlisted -- Maybe",
  "Not Selected",
  "Didn't Qualify",
];

const COHORT_PIPELINE: PipelineStage[] = [
  "Selected for Cohort",
  "Reserve",
  "Cohort Confirmed",
  "Training Active",
  "OET Registered",
  "OET Passed",
  "OET Failed",
  "Placement Ready",
  "Placed",
];

const EXIT_HOLD: PipelineStage[] = ["Deferred", "Dropped Out", "Recommended Pathway"];

function getColumnHeaderClass(stage: PipelineStage): string {
  switch (stage) {
    case "Deferred":
      return "bg-deferred-bg";
    case "Dropped Out":
      return "bg-dropped-out-bg";
    case "Placed":
      return "bg-green-100";
    default:
      return "bg-propela-purple-light";
  }
}

interface PipelineViewProps {
  nurses: Nurse[];
}

export function PipelineView({ nurses: initialNurses }: PipelineViewProps) {
  const [nurses, setNurses] = useState<Nurse[]>(initialNurses);

  useEffect(() => {
    setNurses(initialNurses);
  }, [initialNurses]);

  const getNursesForStage = useCallback(
    (stage: PipelineStage) => nurses.filter((n) => n.pipelineStage === stage),
    [nurses]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;

      if (!destination) return;

      const newStage = destination.droppableId as PipelineStage;
      const nurseId = parseInt(draggableId.replace("nurse-", ""), 10);

      // Find nurse
      const nurse = nurses.find((n) => n.id === nurseId);
      if (!nurse || nurse.pipelineStage === newStage) return;

      // Optimistic update
      const newReadiness = getReadinessFromStage(newStage);
      setNurses((prev) =>
        prev.map((n) =>
          n.id === nurseId
            ? { ...n, pipelineStage: newStage, readinessStatus: newReadiness }
            : n
        )
      );

      // Fire server action (no-op for now, async)
      updateNursePipelineStage(nurseId, newStage);
    },
    [nurses]
  );

  const renderSection = (
    title: string,
    stages: PipelineStage[]
  ) => (
    <div className="mb-6">
      <h2 className="mb-3 text-base font-bold text-gray-700">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            nurses={getNursesForStage(stage)}
            headerClassName={getColumnHeaderClass(stage)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-2">
        {renderSection("Application Funnel", APPLICATION_FUNNEL)}
        {renderSection("Cohort Pipeline", COHORT_PIPELINE)}
        {renderSection("Exit / Hold", EXIT_HOLD)}
      </div>
    </DragDropContext>
  );
}
