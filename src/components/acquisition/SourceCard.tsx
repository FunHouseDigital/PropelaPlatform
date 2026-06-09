"use client";

import { Users, TrendingUp, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AcquisitionSource } from "@/types/acquisition";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  source: AcquisitionSource;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 border-green-200";
    case "Prospective":
      return "bg-propela-purple-light text-propela-purple border-propela-purple/20";
    case "Inactive":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case "Organisation":
      return "bg-blue-100 text-blue-700";
    case "Referral":
      return "bg-amber-100 text-amber-700";
    case "Community":
      return "bg-teal-100 text-teal-700";
    case "Event":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
          {source.name}
        </h3>
        <Badge
          variant="secondary"
          className={cn("text-[10px] font-medium shrink-0", getStatusColor(source.status))}
        >
          {source.status}
        </Badge>
      </div>

      {/* Type Badge */}
      <div className="mt-2">
        <Badge
          variant="secondary"
          className={cn("text-[10px] font-medium", getTypeBadgeColor(source.type))}
        >
          {source.type}
        </Badge>
      </div>

      {/* Contact Person */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
        <Mail className="h-3 w-3 shrink-0" />
        <span className="truncate">{source.contactPerson}</span>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-propela-purple" />
          <div>
            <p className="text-xs text-gray-500">Leads</p>
            <p className="text-sm font-semibold text-gray-900">
              {source.leadsGenerated}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-propela-purple" />
          <div>
            <p className="text-xs text-gray-500">Conversion</p>
            <p className="text-sm font-semibold text-gray-900">
              {source.conversionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Last Contact */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar className="h-3 w-3" />
        <span>Last contact: {new Date(source.lastContact).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
