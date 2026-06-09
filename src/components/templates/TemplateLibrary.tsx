"use client";

import { useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Template } from "@/types/template";
import { useTemplateStore, CategoryFilter, StatusFilter } from "@/store/template-store";
import { TemplateCard } from "./TemplateCard";
import { cn } from "@/lib/utils";

interface TemplateLibraryProps {
  templates: Template[];
}

const categories: CategoryFilter[] = [
  "All",
  "Email",
  "WhatsApp",
  "Letter",
  "SMS",
  "Document",
];

const statuses: StatusFilter[] = ["All", "Active", "Draft", "Archived"];

export function TemplateLibrary({ templates }: TemplateLibraryProps) {
  const {
    searchQuery,
    categoryFilter,
    statusFilter,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
  } = useTemplateStore();

  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.body.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== "All") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "All") {
      result = result.filter((t) => t.status === statusFilter);
    }

    return result;
  }, [templates, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-propela-purple">
            Template Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your reusable message and document templates.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-propela-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-propela-purple-dark">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates by name or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-propela-purple focus:outline-none focus:ring-1 focus:ring-propela-purple"
        />
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Category:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            className={cn(
              "rounded-2xl px-3 py-1 text-xs font-medium transition-colors border",
              categoryFilter === category
                ? "bg-propela-purple text-white border-propela-purple"
                : "bg-white text-propela-purple border-propela-purple/30 hover:border-propela-purple"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-2xl px-3 py-1 text-xs font-medium transition-colors border",
              statusFilter === status
                ? "bg-propela-purple text-white border-propela-purple"
                : "bg-white text-propela-purple border-propela-purple/30 hover:border-propela-purple"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-xs text-gray-500">
        Showing {filteredTemplates.length} of {templates.length} templates
      </p>

      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12">
          <p className="text-sm text-gray-500">No templates found.</p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your filters or search query.
          </p>
        </div>
      )}
    </div>
  );
}
