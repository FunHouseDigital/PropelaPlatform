"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineStage, ReadinessStatus } from "@/types/nurse";
import { ActiveFilters, useNurseStore } from "@/store/nurse-store";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  specialties: string[];
  locations: string[];
}

const allPipelineStages: PipelineStage[] = [
  "Applied",
  "CV Submitted",
  "CV + English Submitted",
  "Under Review",
  "Shortlisted -- Yes",
  "Shortlisted -- Maybe",
  "Not Selected",
  "Didn't Qualify",
  "Selected for Cohort",
  "Reserve",
  "Cohort Confirmed",
  "Training Active",
  "OET Registered",
  "OET Passed",
  "OET Failed",
  "Placement Ready",
  "Placed",
  "Deferred",
  "Dropped Out",
  "Recommended Pathway",
];

const allReadinessStatuses: ReadinessStatus[] = [
  "Not Ready",
  "Placement Ready",
  "Placed",
  "Dropped Out",
  "Deferred",
  "Not Selected",
  "Recommended Pathway",
];

export function FilterPanel({
  open,
  onClose,
  specialties,
  locations,
}: FilterPanelProps) {
  const { activeFilters, setActiveFilters, resetFilters } = useNurseStore();
  const [localFilters, setLocalFilters] = useState<ActiveFilters>(activeFilters);

  const handleOpen = () => {
    setLocalFilters(activeFilters);
  };

  const toggleFilter = (
    category: keyof ActiveFilters,
    value: string
  ) => {
    setLocalFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleApply = () => {
    setActiveFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: ActiveFilters = {
      pipelineStages: [],
      readinessStatuses: [],
      specialties: [],
      locations: [],
    };
    setLocalFilters(emptyFilters);
    resetFilters();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); else handleOpen(); }}>
      <SheetContent className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filter Nurses</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-160px)] mt-4">
          <div className="space-y-5 pr-4">
            {/* Pipeline Stage */}
            <FilterSection
              title="Pipeline Stage"
              items={allPipelineStages}
              selected={localFilters.pipelineStages}
              onToggle={(value) => toggleFilter("pipelineStages", value)}
            />

            <Separator />

            {/* Readiness Status */}
            <FilterSection
              title="Readiness Status"
              items={allReadinessStatuses}
              selected={localFilters.readinessStatuses}
              onToggle={(value) => toggleFilter("readinessStatuses", value)}
            />

            <Separator />

            {/* Specialty */}
            <FilterSection
              title="Specialty"
              items={specialties}
              selected={localFilters.specialties}
              onToggle={(value) => toggleFilter("specialties", value)}
            />

            <Separator />

            {/* Location / Province */}
            <FilterSection
              title="Location / Province"
              items={locations}
              selected={localFilters.locations}
              onToggle={(value) => toggleFilter("locations", value)}
            />
          </div>
        </ScrollArea>
        <SheetFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1 bg-propela-purple hover:bg-propela-purple-dark text-white">
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-700">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item) => (
          <label
            key={item}
            className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
              className="h-4 w-4 rounded border-gray-300 text-propela-purple focus:ring-propela-purple"
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
