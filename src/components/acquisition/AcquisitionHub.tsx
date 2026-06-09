"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AcquisitionSource, OutreachLead } from "@/types/acquisition";
import {
  useAcquisitionStore,
  AcquisitionTab,
} from "@/store/acquisition-store";
import { SourceGrid } from "./SourceGrid";
import { OutreachPipeline } from "./OutreachPipeline";
import { cn } from "@/lib/utils";

interface AcquisitionHubProps {
  sources: AcquisitionSource[];
  leads: OutreachLead[];
}

const tabs: { id: AcquisitionTab; label: string }[] = [
  { id: "organisations", label: "Organisations" },
  { id: "referral", label: "Referral Network" },
  { id: "community", label: "Community Channels" },
  { id: "events", label: "Events" },
  { id: "pipeline", label: "Pipeline" },
];

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Prospective", label: "Prospective" },
  { value: "Inactive", label: "Inactive" },
] as const;

export function AcquisitionHub({ sources, leads }: AcquisitionHubProps) {
  const {
    activeTab,
    searchQuery,
    statusFilter,
    setActiveTab,
    setSearchQuery,
    setStatusFilter,
  } = useAcquisitionStore();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-propela-purple text-white"
                : "bg-white text-propela-purple border border-propela-purple/30 hover:bg-propela-purple-light"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      {activeTab !== "pipeline" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setStatusFilter(
                    option.value as "" | "Active" | "Prospective" | "Inactive"
                  )
                }
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === option.value
                    ? "bg-propela-purple text-white"
                    : "bg-white text-propela-purple border border-propela-purple/30 hover:bg-propela-purple-light"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "pipeline" ? (
        <OutreachPipeline leads={leads} />
      ) : (
        <SourceGrid
          sources={sources}
          activeTab={activeTab}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
        />
      )}
    </div>
  );
}
