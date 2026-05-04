// ============================================================
// Core Domain Types — mirrors the PostgreSQL schema
// ============================================================

export type Role = 'owner' | 'editor' | 'viewer';

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'user'
  | 'formula';

export type ViewType = 'table' | 'kanban' | 'gallery';

// ─── Select option ───────────────────────────────────────────
export interface SelectOption {
  id: string;
  name: string;
  color: string; // tailwind color class e.g. "bg-blue-100 text-blue-700"
}

// ─── Field options (type-specific) ───────────────────────────
export interface FieldOptions {
  choices?: SelectOption[]; // select / multi_select
  formula?: string;         // formula
  dateFormat?: string;      // date
  numberFormat?: string;    // number: 'integer' | 'decimal' | 'currency'
}

// ─── Entities ────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  profile?: { email: string; full_name?: string; avatar_url?: string };
}

export interface Base {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  base_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Field {
  id: string;
  table_id: string;
  name: string;
  type: FieldType;
  options: FieldOptions;
  position: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Record_ {
  id: string;
  table_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// A cell's value varies by field type
export type CellValue = string | number | boolean | string[] | null;

export interface Cell {
  id: string;
  record_id: string;
  field_id: string;
  value: CellValue;
  updated_at: string;
}

// Denormalised record with all its cell values keyed by field_id
export interface RecordRow {
  id: string;
  table_id: string;
  position: number;
  created_at: string;
  created_by?: string;
  cells: Record<string, CellValue>; // { [field_id]: value }
}

// ─── View config ─────────────────────────────────────────────
export interface FilterCondition {
  id: string;
  fieldId: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'is_empty'
    | 'is_not_empty'
    | 'greater_than'
    | 'less_than';
  value: CellValue;
}

export interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface SortConfig {
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface ViewConfig {
  filters: FilterGroup;
  sorts: SortConfig[];
  groupByFieldId: string | null;
  hiddenFields: string[];
  columnWidths: Record<string, number>; // { [field_id]: width_px }
}

export interface View {
  id: string;
  table_id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  position: number;
  created_at: string;
  updated_at: string;
}

// ─── API response wrappers ────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ─── UI state helpers ─────────────────────────────────────────
export interface ColumnDef {
  field: Field;
  width: number;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multi_select: 'Multi-Select',
  date: 'Date',
  checkbox: 'Checkbox',
  user: 'User',
  formula: 'Formula',
};

export const DEFAULT_COLUMN_WIDTH = 180;

export const SELECT_COLORS: string[] = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-gray-100 text-gray-700',
];
