"use client";

import { Badge } from "@/components/ui/badge";
import { CohortNurseSummary } from "@/types/cohort";
import { cn } from "@/lib/utils";
import { getPipelineBadgeColor, getOetStatusColor, getPlacementStatusColor } from "@/lib/badge-colors";

interface NurseProgressTableProps {
  nurses: CohortNurseSummary[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NurseProgressTable({ nurses }: NurseProgressTableProps) {
  if (nurses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No nurses assigned to this cohort yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Pipeline Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                OET Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Placement Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {nurses.map((nurse) => (
              <tr
                key={nurse.id}
                className="transition-colors hover:bg-gray-50/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-propela-purple text-xs font-semibold text-white">
                      {getInitials(nurse.fullName)}
                    </div>
                    <span className="font-medium text-gray-900">
                      {nurse.fullName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium",
                      getPipelineBadgeColor(nurse.pipelineStage)
                    )}
                  >
                    {nurse.pipelineStage}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      getOetStatusColor(nurse.oetStatus)
                    )}
                  >
                    {nurse.oetStatus || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      getPlacementStatusColor(nurse.placementStatus)
                    )}
                  >
                    {nurse.placementStatus || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
