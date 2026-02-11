import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineFilters {
  owner?: string;
  productLine?: string;
  basin?: string;
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Pipeline filters
  pipelineFilters: PipelineFilters;
  setPipelineFilters: (filters: PipelineFilters) => void;
  clearPipelineFilters: () => void;

  // List settings
  listPageSize: number;
  setListPageSize: (size: number) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Pipeline filters
      pipelineFilters: {},
      setPipelineFilters: (filters) => set({ pipelineFilters: filters }),
      clearPipelineFilters: () => set({ pipelineFilters: {} }),

      // List settings
      listPageSize: 25,
      setListPageSize: (size) => set({ listPageSize: size }),
    }),
    {
      name: 'tss-ui-state',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        pipelineFilters: state.pipelineFilters,
        listPageSize: state.listPageSize,
      }),
    }
  )
);
