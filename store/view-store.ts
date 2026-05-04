/**
 * store/view-store.ts
 * Zustand store for Airtable-style view preferences.
 * Persists view mode per "table key" (e.g. 'issues', 'projects', 'okr').
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'grid' | 'kanban' | 'gallery';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  value: string;
}

interface ViewState {
  /** view mode per table key */
  views: Record<string, ViewMode>;
  setView: (tableKey: string, mode: ViewMode) => void;
  getView: (tableKey: string, fallback?: ViewMode) => ViewMode;

  /** sort per table key */
  sorts: Record<string, SortConfig | null>;
  setSort: (tableKey: string, sort: SortConfig | null) => void;
  getSort: (tableKey: string) => SortConfig | null;

  /** filters per table key */
  filters: Record<string, FilterConfig[]>;
  setFilters: (tableKey: string, filters: FilterConfig[]) => void;
  addFilter: (tableKey: string, filter: FilterConfig) => void;
  removeFilter: (tableKey: string, index: number) => void;
  clearFilters: (tableKey: string) => void;

  /** expanded row for side panel */
  expandedRowId: string | null;
  setExpandedRowId: (id: string | null) => void;

  /** group-by field per table key */
  groupBy: Record<string, string | null>;
  setGroupBy: (tableKey: string, field: string | null) => void;
  getGroupBy: (tableKey: string) => string | null;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set, get) => ({
      views: {},
      setView: (tableKey, mode) =>
        set((s) => ({ views: { ...s.views, [tableKey]: mode } })),
      getView: (tableKey, fallback = 'grid') => get().views[tableKey] ?? fallback,

      sorts: {},
      setSort: (tableKey, sort) =>
        set((s) => ({ sorts: { ...s.sorts, [tableKey]: sort } })),
      getSort: (tableKey) => get().sorts[tableKey] ?? null,

      filters: {},
      setFilters: (tableKey, filters) =>
        set((s) => ({ filters: { ...s.filters, [tableKey]: filters } })),
      addFilter: (tableKey, filter) =>
        set((s) => ({
          filters: { ...s.filters, [tableKey]: [...(s.filters[tableKey] ?? []), filter] },
        })),
      removeFilter: (tableKey, index) =>
        set((s) => ({
          filters: {
            ...s.filters,
            [tableKey]: (s.filters[tableKey] ?? []).filter((_, i) => i !== index),
          },
        })),
      clearFilters: (tableKey) =>
        set((s) => ({ filters: { ...s.filters, [tableKey]: [] } })),

      expandedRowId: null,
      setExpandedRowId: (expandedRowId) => set({ expandedRowId }),

      groupBy: {},
      setGroupBy: (tableKey, field) =>
        set((s) => ({ groupBy: { ...s.groupBy, [tableKey]: field } })),
      getGroupBy: (tableKey) => get().groupBy[tableKey] ?? null,
    }),
    {
      name: 'omes-view-store',
      // Only persist view preferences, not ephemeral UI state
      partialize: (s) => ({ views: s.views, sorts: s.sorts, groupBy: s.groupBy }),
    },
  ),
);
