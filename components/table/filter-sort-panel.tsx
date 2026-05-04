'use client';
import { useState } from 'react';
import { useTableStore } from '@/store/table-store';
import { FilterCondition, SortConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

let _condId = 0;
function nextId() { return `cond-${++_condId}`; }

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
] as const;

export function FilterSortPanel() {
  const { fields, getActiveView, updateViewConfig } = useTableStore();
  const view = getActiveView();
  const config = view?.config;

  const conditions: FilterCondition[] = config?.filters?.conditions ?? [];
  const logic: 'AND' | 'OR' = config?.filters?.logic ?? 'AND';
  const sorts: SortConfig[] = config?.sorts ?? [];

  function save(patch: object) {
    if (!view) return;
    updateViewConfig(view.id, patch as Parameters<typeof updateViewConfig>[1]);
  }

  // ── Filter helpers ──────────────────────────────────────────
  function addCondition() {
    const first = fields[0];
    if (!first) return;
    const cond: FilterCondition = {
      id: nextId(),
      fieldId: first.id,
      operator: 'contains',
      value: '',
    };
    save({ filters: { logic, conditions: [...conditions, cond] } });
  }

  function updateCondition(id: string, patch: Partial<FilterCondition>) {
    save({
      filters: {
        logic,
        conditions: conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    });
  }

  function removeCondition(id: string) {
    save({ filters: { logic, conditions: conditions.filter((c) => c.id !== id) } });
  }

  function toggleLogic() {
    save({ filters: { logic: logic === 'AND' ? 'OR' : 'AND', conditions } });
  }

  // ── Sort helpers ────────────────────────────────────────────
  function addSort() {
    const first = fields[0];
    if (!first) return;
    save({ sorts: [...sorts, { fieldId: first.id, direction: 'asc' as const }] });
  }

  function updateSort(idx: number, patch: Partial<SortConfig>) {
    save({ sorts: sorts.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  }

  function removeSort(idx: number) {
    save({ sorts: sorts.filter((_, i) => i !== idx) });
  }

  const noValueOps = new Set(['is_empty', 'is_not_empty']);

  return (
    <div className="flex gap-8 px-4 py-3 text-xs text-gray-700">
      {/* Filters */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-800">Filters</span>
          {conditions.length > 1 && (
            <button
              onClick={toggleLogic}
              className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100"
            >
              {logic}
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {conditions.map((cond) => (
            <div key={cond.id} className="flex items-center gap-1.5">
              <select
                className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white"
                value={cond.fieldId}
                onChange={(e) => updateCondition(cond.id, { fieldId: e.target.value })}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select
                className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white"
                value={cond.operator}
                onChange={(e) =>
                  updateCondition(cond.id, {
                    operator: e.target.value as FilterCondition['operator'],
                  })
                }
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {!noValueOps.has(cond.operator) && (
                <input
                  className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white w-28"
                  value={cond.value == null ? '' : String(cond.value)}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value || null })}
                  placeholder="value"
                />
              )}
              <button
                onClick={() => removeCondition(cond.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addCondition}
          className="mt-2 flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add filter
        </button>
      </div>

      {/* Sorts */}
      <div className="flex-1 min-w-0">
        <div className="mb-2 font-semibold text-gray-800">Sort</div>
        <div className="space-y-1.5">
          {sorts.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <select
                className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white"
                value={s.fieldId}
                onChange={(e) => updateSort(idx, { fieldId: e.target.value })}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  updateSort(idx, { direction: s.direction === 'asc' ? 'desc' : 'asc' })
                }
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-1 rounded border text-xs',
                  s.direction === 'asc'
                    ? 'border-gray-200 text-gray-600'
                    : 'border-indigo-200 text-indigo-600 bg-indigo-50'
                )}
              >
                {s.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {s.direction}
              </button>
              <button
                onClick={() => removeSort(idx)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addSort}
          className="mt-2 flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add sort
        </button>
      </div>
    </div>
  );
}
