import { create } from 'zustand';
import { CohortStatus } from '@/types/cohort';

interface CohortStoreState {
  searchQuery: string;
  statusFilter: 'All' | CohortStatus;
  selectedCohortId: string | null;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'All' | CohortStatus) => void;
  setSelectedCohortId: (id: string | null) => void;
}

export const useCohortStore = create<CohortStoreState>((set) => ({
  searchQuery: '',
  statusFilter: 'All',
  selectedCohortId: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSelectedCohortId: (id) => set({ selectedCohortId: id }),
}));
