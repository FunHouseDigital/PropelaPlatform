"use client";

import { Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OutreachLead } from "@/types/acquisition";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: OutreachLead;
}

function getStageBadgeColor(stage: string): string {
  switch (stage) {
    case "Contacted":
      return "bg-blue-100 text-blue-700";
    case "Interested":
      return "bg-amber-100 text-amber-700";
    case "Applied":
      return "bg-propela-purple-light text-propela-purple";
    case "Converted":
      return "bg-green-100 text-green-700";
    case "Lost":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm border border-gray-100 transition-all hover:shadow-md">
      {/* Nurse name */}
      <h4 className="text-sm font-semibold text-gray-900">
        {lead.nurseFullName}
      </h4>

      {/* Source */}
      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <ArrowRight className="h-3 w-3" />
        <span className="truncate">{lead.sourceName}</span>
      </div>

      {/* Contact date */}
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Calendar className="h-3 w-3" />
        <span>{new Date(lead.contactDate).toLocaleDateString()}</span>
      </div>

      {/* Follow-up indicator */}
      {lead.followUpDate && (
        <div className="mt-1.5">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-medium",
              new Date(lead.followUpDate) <= new Date()
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-blue-50 text-blue-600 border-blue-200"
            )}
          >
            Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}
          </Badge>
        </div>
      )}

      {/* Stage badge */}
      <div className="mt-2">
        <Badge
          variant="secondary"
          className={cn("text-[10px] font-medium", getStageBadgeColor(lead.stage))}
        >
          {lead.stage}
        </Badge>
      </div>
    </div>
  );
}
