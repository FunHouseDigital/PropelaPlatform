"use client";

import Link from "next/link";
import { Calendar, Users, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Cohort } from "@/types/cohort";
import { cn } from "@/lib/utils";

interface CohortCardProps {
  cohort: Cohort;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 border-green-200";
    case "Planned":
      return "bg-propela-purple-light text-propela-purple border-propela-purple/20";
    case "Completed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Archived":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CohortCard({ cohort }: CohortCardProps) {
  const budgetPercentage =
    cohort.budget.allocated > 0
      ? Math.round((cohort.budget.spent / cohort.budget.allocated) * 100)
      : 0;

  return (
    <Link href={`/cohorts/${cohort.id}`}>
      <div className="group rounded-xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-gray-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900">{cohort.name}</h3>
          <Badge
            variant="secondary"
            className={cn("text-[10px] font-medium shrink-0", getStatusColor(cohort.status))}
          >
            {cohort.status}
          </Badge>
        </div>

        {/* Date range */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
          </span>
        </div>

        {/* Training Provider */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{cohort.trainingProvider}</span>
        </div>

        {/* Budget Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Budget</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(cohort.budget.spent)} / {formatCurrency(cohort.budget.allocated)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-propela-purple transition-all"
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        </div>

        {/* Outcomes */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-center">
            <div className="text-lg font-bold text-propela-purple">
              {cohort.outcomeTargets.currentPlacements}
              <span className="text-xs font-normal text-gray-400">
                /{cohort.outcomeTargets.placementTarget}
              </span>
            </div>
            <div className="text-[10px] text-gray-500">Placements</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-propela-purple">
              {cohort.outcomeTargets.passRate}%
            </div>
            <div className="text-[10px] text-gray-500">Pass Rate</div>
          </div>
          <div className="flex items-center gap-1 text-center">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <div className="text-lg font-bold text-propela-purple">
              {cohort.nurses.length}
            </div>
            <div className="text-[10px] text-gray-500">Nurses</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
