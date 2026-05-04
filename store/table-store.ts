import { create } from 'zustand';
import { Field, RecordRow, View, ViewConfig, CellValue } from '@/lib/types';
import { applySort, defaultViewConfig } from '@/lib/utils';

interface TableStore {
  tableId: string | null;
  tableName: string;
  fields: Field[];
  records: RecordRow[];
  views: View[];
  activeViewId: string | null;
  selectedRecordIds: Set<string>;
  search: string;
  loading: boolean;
  // Pending record to open in detail panel (set by WorkBaseShell for deep-link)
  openRecordId: string | null;
  // Pagination
  totalRecords: number;
  currentPage: number;
  pageLimit: number;
  loadingMore: boolean;
  // Global Settings
  rowHeight: 'compact' | 'normal' | 'large';
  showRowNumbers: boolean;

  // Setters
  init: (tableId: string, tableName: string, fields: Field[], records: RecordRow[], views: View[], total?: number, page?: number, limit?: number) => void;
  appendRecords: (records: RecordRow[], newPage: number, total: number) => void;
  setLoadingMore: (v: boolean) => void;
  setActiveView: (id: string) => void;
  setSearch: (s: string) => void;
  setLoading: (v: boolean) => void;
  setPageLimit: (limit: number) => void;
  setRowHeight: (height: 'compact' | 'normal' | 'large') => void;
  setShowRowNumbers: (show: boolean) => void;
  setOpenRecordId: (id: string | null) => void;

  // Field ops
  addField: (field: Field) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  removeField: (id: string) => void;
  reorderFields: (orderedIds: string[]) => void;

  // Record ops
  addRecord: (record: RecordRow) => void;
  updateCell: (recordId: string, fieldId: string, value: CellValue) => void;
  removeRecord: (id: string) => void;
  removeRecords: (ids: string[]) => void;
  toggleSelectRecord: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // View ops
  addView: (view: View) => void;
  updateViewConfig: (viewId: string, config: Partial<ViewConfig>) => void;

  // Derived
  getActiveView: () => View | null;
  getVisibleRecords: () => RecordRow[];
}

export const useTableStore = create<TableStore>((set, get) => ({
  tableId: null,
  tableName: '',
  fields: [],
  records: [],
  views: [],
  activeViewId: null,
  selectedRecordIds: new Set(),
  search: '',
  loading: false,
  openRecordId: null,
  totalRecords: 0,
  currentPage: 1,
  pageLimit: 50,
  loadingMore: false,
  rowHeight: 'normal',
  showRowNumbers: true,

  init: (tableId, tableName, fields, records, views, total = records.length, page = 1, limit = 50) =>
    set({
      tableId,
      tableName,
      fields,
      records,
      views,
      activeViewId: views[0]?.id ?? null,
      selectedRecordIds: new Set(),
      search: '',
      totalRecords: total,
      currentPage: page,
      pageLimit: limit,
      loadingMore: false,
      openRecordId: null,
    }),

  appendRecords: (newRecords, newPage, total) =>
    set((s) => ({
      records: [...s.records, ...newRecords],
      currentPage: newPage,
      totalRecords: total,
      loadingMore: false,
    })),

  setLoadingMore: (v) => set({ loadingMore: v }),
  setPageLimit: (limit) => set({ pageLimit: limit }),
  setRowHeight: (height) => set({ rowHeight: height }),
  setShowRowNumbers: (show) => set({ showRowNumbers: show }),
  setOpenRecordId: (id) => set({ openRecordId: id }),

  setActiveView: (id) => set({ activeViewId: id }),
  setSearch: (search) => set({ search }),
  setLoading: (loading) => set({ loading }),

  addField: (field) => set((s) => ({ fields: [...s.fields, field] })),
  updateField: (id, patch) =>
    set((s) => ({ fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  removeField: (id) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== id),
      records: s.records.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    })),
  reorderFields: (orderedIds) =>
    set((s) => {
      const map = new Map(s.fields.map((f) => [f.id, f]));
      return { fields: orderedIds.map((id, i) => ({ ...map.get(id)!, position: i })) };
    }),

  addRecord: (record) => set((s) => ({ records: [...s.records, record] })),
  updateCell: (recordId, fieldId, value) =>
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r
      ),
    })),
  removeRecord: (id) =>
    set((s) => ({
      records: s.records.filter((r) => r.id !== id),
      selectedRecordIds: new Set([...s.selectedRecordIds].filter((x) => x !== id)),
    })),
  removeRecords: (ids) => {
    const idSet = new Set(ids);
    set((s) => ({
      records: s.records.filter((r) => !idSet.has(r.id)),
      selectedRecordIds: new Set([...s.selectedRecordIds].filter((x) => !idSet.has(x))),
    }));
  },

  toggleSelectRecord: (id) =>
    set((s) => {
      const next = new Set(s.selectedRecordIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedRecordIds: next };
    }),
  selectAll: () => set((s) => ({ selectedRecordIds: new Set(s.records.map((r) => r.id)) })),
  clearSelection: () => set({ selectedRecordIds: new Set() }),

  addView: (view) => set((s) => ({ views: [...s.views, view] })),
  updateViewConfig: (viewId, configPatch) =>
    set((s) => ({
      views: s.views.map((v) =>
        v.id === viewId ? { ...v, config: { ...v.config, ...configPatch } } : v
      ),
    })),

  getActiveView: () => {
    const { views, activeViewId } = get();
    return views.find((v) => v.id === activeViewId) ?? views[0] ?? null;
  },

  getVisibleRecords: () => {
    const { records, fields, search } = get();
    const view = get().getActiveView();
    const config = view?.config ?? defaultViewConfig();

    let rows = [...records];

    // Search across all text-ish fields
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.cells).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Filters
    const { filters } = config;
    if (filters?.conditions?.length) {
      rows = rows.filter((row) => {
        const results = filters.conditions.map((cond) => {
          const field = fields.find((f) => f.id === cond.fieldId);
          if (!field) return true;
          const cell = row.cells[cond.fieldId] ?? null;
          switch (cond.operator) {
            case 'is_empty': return cell === null || cell === '';
            case 'is_not_empty': return cell !== null && cell !== '';
            case 'equals': return String(cell) === String(cond.value);
            case 'not_equals': return String(cell) !== String(cond.value);
            case 'contains': return String(cell).toLowerCase().includes(String(cond.value).toLowerCase());
            case 'not_contains': return !String(cell).toLowerCase().includes(String(cond.value).toLowerCase());
            case 'greater_than': return Number(cell) > Number(cond.value);
            case 'less_than': return Number(cell) < Number(cond.value);
            default: return true;
          }
        });
        return filters.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
      });
    }

    // Sorts
    if (config.sorts?.length) {
      rows = applySort(rows, config.sorts, fields);
    }

    return rows;
  },
}));
