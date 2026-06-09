"use client";

import { useMemo, useState } from "react";
import { Nurse } from "@/types/nurse";
import { useNurseStore } from "@/store/nurse-store";
import { calculateCvScore } from "@/lib/nurse-utils";
import { ViewControls } from "./ViewControls";
import { GalleryView } from "./GalleryView";
import { FilterPanel } from "./FilterPanel";

interface NurseDatabaseProps {
  nurses: Nurse[];
}

export function NurseDatabase({ nurses }: NurseDatabaseProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const { viewMode, searchQuery, activeFilters, sortField, sortDirection } =
    useNurseStore();

  // Extract unique specialties and locations from data
  const specialties = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => {
      if (n.primaryClinicalSpecialty) set.add(n.primaryClinicalSpecialty);
    });
    return Array.from(set).sort();
  }, [nurses]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => {
      if (n.provinceCity) {
        // Extract just the province part for filtering
        const province = n.provinceCity.split(",")[0].trim();
        set.add(province);
      }
    });
    return Array.from(set).sort();
  }, [nurses]);

  // Filter and sort nurses
  const filteredNurses = useMemo(() => {
    let result = [...nurses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((n) =>
        n.fullName.toLowerCase().includes(query)
      );
    }

    // Pipeline stage filter
    if (activeFilters.pipelineStages.length > 0) {
      result = result.filter((n) =>
        activeFilters.pipelineStages.includes(n.pipelineStage)
      );
    }

    // Readiness status filter
    if (activeFilters.readinessStatuses.length > 0) {
      result = result.filter((n) =>
        activeFilters.readinessStatuses.includes(n.readinessStatus)
      );
    }

    // Specialty filter
    if (activeFilters.specialties.length > 0) {
      result = result.filter(
        (n) =>
          n.primaryClinicalSpecialty &&
          activeFilters.specialties.includes(n.primaryClinicalSpecialty)
      );
    }

    // Location filter
    if (activeFilters.locations.length > 0) {
      result = result.filter((n) => {
        if (!n.provinceCity) return false;
        const province = n.provinceCity.split(",")[0].trim();
        return activeFilters.locations.includes(province);
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "cvScore":
          comparison = calculateCvScore(a) - calculateCvScore(b);
          break;
        case "yearsExperience":
          comparison = a.yearsExperience - b.yearsExperience;
          break;
        case "submittedAt": {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [nurses, searchQuery, activeFilters, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      <ViewControls onOpenFilter={() => setFilterOpen(true)} />

      {viewMode === "gallery" && <GalleryView nurses={filteredNurses} />}
      {viewMode === "pipeline" && (
        <div className="rounded-lg border p-8 text-center text-gray-500">
          Pipeline view coming soon
        </div>
      )}
      {viewMode === "table" && (
        <div className="rounded-lg border p-8 text-center text-gray-500">
          Table view coming soon
        </div>
      )}

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        specialties={specialties}
        locations={locations}
      />
    </div>
  );
}
