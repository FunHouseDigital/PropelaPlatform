import { create } from 'zustand';

export type CategoryFilter = 'All' | 'Email' | 'WhatsApp' | 'Letter' | 'SMS' | 'Document';
export type StatusFilter = 'All' | 'Active' | 'Draft' | 'Archived';

interface TemplateStoreState {
  searchQuery: string;
  categoryFilter: CategoryFilter;
  statusFilter: StatusFilter;
  selectedTemplateId: string | null;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSelectedTemplateId: (id: string | null) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set) => ({
  searchQuery: '',
  categoryFilter: 'All',
  statusFilter: 'All',
  selectedTemplateId: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
}));
