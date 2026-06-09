import { create } from 'zustand';

export type AcquisitionTab = 'organisations' | 'referral' | 'community' | 'events' | 'pipeline';
export type StatusFilter = '' | 'Active' | 'Prospective' | 'Inactive';

interface AcquisitionStoreState {
  activeTab: AcquisitionTab;
  searchQuery: string;
  statusFilter: StatusFilter;
  setActiveTab: (tab: AcquisitionTab) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
}

export const useAcquisitionStore = create<AcquisitionStoreState>((set) => ({
  activeTab: 'organisations',
  searchQuery: '',
  statusFilter: '',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
