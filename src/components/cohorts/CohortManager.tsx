"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Cohort, CohortStatus } from "@/types/cohort";
import { useCohortStore } from "@/store/cohort-store";
import { CohortCard } from "./CohortCard";
import { cn } from "@/lib/utils";

interface CohortManagerProps {
  cohorts: Cohort[];
}

const statusFilters: Array<"All" | CohortStatus> = [
  "All",
  "Active",
  "Planned",
  "Completed",
  "Archived",
];

export function CohortManager({ cohorts }: CohortManagerProps) {
  const { searchQuery, statusFilter, setSearchQuery, setStatusFilter } =
    useCohortStore();

  const filteredCohorts = useMemo(() => {
    let result = [...cohorts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }

    if (statusFilter !== "All") {
      result = result.filter((c) => c.status === statusFilter);
    }

    return result;
  }, [cohorts, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search cohorts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-2xl px-4 py-1.5 text-sm font-medium transition-colors",
                statusFilter === filter
                  ? "bg-propela-purple text-white"
                  : "bg-white text-propela-purple border border-propela-purple/30 hover:bg-propela-purple-light"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Cohort Grid */}
      {filteredCohorts.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-gray-500">No cohorts found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCohorts.map((cohort) => (
            <CohortCard key={cohort.id} cohort={cohort} />
          ))}
        </div>
      )}
    </div>
  );
}
