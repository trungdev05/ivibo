import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import type { Field, RecordRow, SortConfig, ViewConfig } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { uuidv4 as uuid };

export function defaultViewConfig(): ViewConfig {
  return {
    filters: { logic: 'AND', conditions: [] },
    sorts: [],
    groupByFieldId: null,
    hiddenFields: [],
    columnWidths: {},
  };
}

export function applySort(rows: RecordRow[], sorts: SortConfig[], fields: Field[]): RecordRow[] {
  if (!sorts.length) return rows;
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const field = fields.find((f) => f.id === sort.fieldId);
      if (!field) continue;
      const av = a.cells[sort.fieldId] ?? null;
      const bv = b.cells[sort.fieldId] ?? null;
      let cmp = 0;
      if (av === null && bv === null) cmp = 0;
      else if (av === null) cmp = 1;
      else if (bv === null) cmp = -1;
      else if (field.type === 'number') cmp = Number(av) - Number(bv);
      else cmp = String(av).localeCompare(String(bv));
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
