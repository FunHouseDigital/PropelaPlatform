"use client";

import { OutreachLead, OutreachStage } from "@/types/acquisition";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

interface OutreachPipelineProps {
  leads: OutreachLead[];
}

const stages: { id: OutreachStage; label: string; color: string }[] = [
  { id: "Contacted", label: "Contacted", color: "border-t-blue-400" },
  { id: "Interested", label: "Interested", color: "border-t-amber-400" },
  { id: "Applied", label: "Applied", color: "border-t-purple-400" },
  { id: "Converted", label: "Converted", color: "border-t-green-400" },
  { id: "Lost", label: "Lost", color: "border-t-red-400" },
];

export function OutreachPipeline({ leads }: OutreachPipelineProps) {
  const leadsByStage = stages.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.stage === stage.id),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {leadsByStage.map((stageGroup) => (
        <div
          key={stageGroup.id}
          className={cn(
            "rounded-xl bg-gray-50 border border-gray-100 border-t-4 p-3",
            stageGroup.color
          )}
        >
          {/* Stage Header */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {stageGroup.label}
            </h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
              {stageGroup.leads.length}
            </span>
          </div>

          {/* Lead Cards */}
          <div className="space-y-2">
            {stageGroup.leads.length > 0 ? (
              stageGroup.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))
            ) : (
              <p className="py-4 text-center text-xs text-gray-400">
                No leads
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
