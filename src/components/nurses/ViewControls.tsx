"use client";

import { Search, LayoutGrid, Columns, Table2, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNurseStore, ViewMode, SortField } from "@/store/nurse-store";

interface ViewControlsProps {
  onOpenFilter: () => void;
}

export function ViewControls({ onOpenFilter }: ViewControlsProps) {
  const {
    viewMode,
    searchQuery,
    sortField,
    sortDirection,
    setViewMode,
    setSearchQuery,
    setSortField,
    setSortDirection,
  } = useNurseStore();

  const viewOptions: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "gallery", icon: LayoutGrid, label: "Gallery" },
    { mode: "pipeline", icon: Columns, label: "Pipeline" },
    { mode: "table", icon: Table2, label: "Table" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Search and Filter */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFilter}
          className="gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Right side: Sort and View Toggle */}
      <div className="flex items-center gap-2">
        {/* Sort */}
        <div className="flex items-center gap-1">
          <Select
            value={sortField}
            onValueChange={(value) => setSortField(value as SortField)}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="cvScore">CV Score</SelectItem>
              <SelectItem value="yearsExperience">Years Exp</SelectItem>
              <SelectItem value="submittedAt">Submitted Date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() =>
              setSortDirection(sortDirection === "asc" ? "desc" : "asc")
            }
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-md border bg-white">
          {viewOptions.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 rounded-none px-3",
                viewMode === mode &&
                  "bg-propela-purple-light text-propela-purple"
              )}
              onClick={() => setViewMode(mode)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
