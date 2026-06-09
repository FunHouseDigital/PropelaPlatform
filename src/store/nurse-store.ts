import { create } from 'zustand';

export type ViewMode = 'gallery' | 'pipeline' | 'table';
export type SortField = 'name' | 'cvScore' | 'yearsExperience' | 'submittedAt';
export type SortDirection = 'asc' | 'desc';

export interface ActiveFilters {
  pipelineStages: string[];
  readinessStatuses: string[];
  specialties: string[];
  locations: string[];
}

interface NurseStoreState {
  viewMode: ViewMode;
  searchQuery: string;
  activeFilters: ActiveFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilters: (filters: ActiveFilters) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  resetFilters: () => void;
}

const defaultFilters: ActiveFilters = {
  pipelineStages: [],
  readinessStatuses: [],
  specialties: [],
  locations: [],
};

export const useNurseStore = create<NurseStoreState>((set) => ({
  viewMode: 'gallery',
  searchQuery: '',
  activeFilters: { ...defaultFilters },
  sortField: 'name',
  sortDirection: 'asc',
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFilters: (filters) => set({ activeFilters: filters }),
  setSortField: (field) => set({ sortField: field }),
  setSortDirection: (direction) => set({ sortDirection: direction }),
  resetFilters: () => set({ activeFilters: { ...defaultFilters } }),
}));
