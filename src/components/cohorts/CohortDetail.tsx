"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Building2, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Cohort } from "@/types/cohort";
import { NurseProgressTable } from "./NurseProgressTable";
import { cn } from "@/lib/utils";
import { getCohortStatusColor } from "@/lib/badge-colors";

interface CohortDetailProps {
  cohort: Cohort;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
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

export function CohortDetail({ cohort }: CohortDetailProps) {
  const budgetPercentage =
    cohort.budget.allocated > 0
      ? Math.round((cohort.budget.spent / cohort.budget.allocated) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/cohorts"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-propela-purple transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cohorts
      </Link>

      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{cohort.name}</h1>
              <Badge
                variant="secondary"
                className={cn("text-xs font-medium", getCohortStatusColor(cohort.status))}
              >
                {cohort.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-600">{cohort.description}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            <span>{cohort.trainingProvider}</span>
          </div>
        </div>
      </div>

      {/* Budget and Outcomes Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Budget Breakdown */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-propela-purple" />
            Budget Breakdown
          </h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Allocated</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(cohort.budget.allocated)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Spent</span>
              <span className="text-sm font-semibold text-propela-purple">
                {formatCurrency(cohort.budget.spent)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Remaining</span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(cohort.budget.remaining)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>{budgetPercentage}% used</span>
                <span>100%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-propela-purple transition-all"
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Outcome Targets */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Target className="h-4 w-4 text-propela-purple" />
            Outcomes - Target vs Actual
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Placements</span>
                <span className="font-semibold text-gray-900">
                  {cohort.outcomeTargets.currentPlacements} / {cohort.outcomeTargets.placementTarget}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${
                      cohort.outcomeTargets.placementTarget > 0
                        ? Math.round(
                            (cohort.outcomeTargets.currentPlacements /
                              cohort.outcomeTargets.placementTarget) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pass Rate</span>
                <span className="font-semibold text-gray-900">
                  {cohort.outcomeTargets.passRate}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-propela-purple transition-all"
                  style={{ width: `${cohort.outcomeTargets.passRate}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Nurses</span>
              <span className="font-semibold text-gray-900">{cohort.nurses.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Timeline</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-propela-purple" />
            <div className="mt-1 text-xs text-gray-500">Start</div>
            <div className="text-xs font-medium text-gray-700">
              {formatDate(cohort.startDate)}
            </div>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-propela-purple/30" />
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full border-2 border-propela-purple bg-white" />
            <div className="mt-1 text-xs text-gray-500">End</div>
            <div className="text-xs font-medium text-gray-700">
              {formatDate(cohort.endDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {cohort.notes && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <p className="mt-2 text-sm text-gray-600">{cohort.notes}</p>
        </div>
      )}

      {/* Nurse Progress Table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Nurse Progress
        </h2>
        <NurseProgressTable nurses={cohort.nurses} />
      </div>
    </div>
  );
}
