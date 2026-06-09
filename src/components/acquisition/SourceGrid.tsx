"use client";

import { AcquisitionSource } from "@/types/acquisition";
import { AcquisitionTab } from "@/store/acquisition-store";
import { SourceCard } from "./SourceCard";

interface SourceGridProps {
  sources: AcquisitionSource[];
  activeTab: AcquisitionTab;
  searchQuery: string;
  statusFilter: string;
}

function getTypeForTab(tab: AcquisitionTab): string {
  switch (tab) {
    case "organisations":
      return "Organisation";
    case "referral":
      return "Referral";
    case "community":
      return "Community";
    case "events":
      return "Event";
    default:
      return "";
  }
}

export function SourceGrid({
  sources,
  activeTab,
  searchQuery,
  statusFilter,
}: SourceGridProps) {
  const type = getTypeForTab(activeTab);

  const filteredSources = sources.filter((source) => {
    if (source.type !== type) return false;
    if (
      searchQuery &&
      !source.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter && source.status !== statusFilter) return false;
    return true;
  });

  if (filteredSources.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center border border-gray-100">
        <p className="text-sm text-gray-500">
          No sources found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredSources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  );
}
