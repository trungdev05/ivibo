'use client';
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTableStore } from '@/store/table-store';
import { RecordRow, Field, SelectOption, CellValue } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export function KanbanView() {
  const { fields, getVisibleRecords, getActiveView, updateCell, tableId, addRecord } = useTableStore();
  const records = getVisibleRecords();
  const view = getActiveView();

  // Pick group field: view config groupByFieldId, or first select/multi_select field
  const groupFieldId =
    view?.config?.groupByFieldId ??
    fields.find((f) => f.type === 'select' || f.type === 'multi_select')?.id ??
    null;

  const groupField = fields.find((f) => f.id === groupFieldId) ?? null;
  const choices: SelectOption[] = groupField?.options?.choices ?? [];

  // Build columns: one per choice + unassigned
  const columns: { id: string; label: string; color: string }[] = [
    ...choices.map((c) => ({ id: c.id, label: c.name, color: c.color })),
    { id: '__none__', label: 'No Status', color: 'bg-gray-100 text-gray-600' },
  ];

  const recordsByColumn = (colId: string): RecordRow[] => {
    if (!groupField) return colId === '__none__' ? records : [];
    return records.filter((r) => {
      const val = r.cells[groupField.id];
      if (colId === '__none__') return val === null || val === undefined || val === '';
      return String(val) === colId;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeRecord, setActiveRecord] = useState<RecordRow | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const rec = records.find((r) => r.id === e.active.id);
    setActiveRecord(rec ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveRecord(null);
    const { active, over } = e;
    if (!over || !groupField) return;

    // over.id could be a column droppable or a card
    const destColId = String(over.id).startsWith('col-')
      ? String(over.id).replace('col-', '')
      : columns.find((c) => recordsByColumn(c.id).some((r) => r.id === over.id))?.id;

    if (!destColId) return;
    const newVal: CellValue = destColId === '__none__' ? null : destColId;
    updateCell(String(active.id), groupField.id, newVal);
    fetch(`/api/records/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells: { [groupField.id]: newVal } }),
    });
  };

  const primaryField = fields.find((f) => f.is_primary) ?? fields[0];

  const handleAddCard = async (colId: string) => {
    if (!tableId) return;
    const cells: Record<string, CellValue> = {};
    if (groupField && colId !== '__none__') cells[groupField.id] = colId;
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, cells }),
    });
    const { data } = await res.json();
    if (data) addRecord({ ...data, cells: data.cells ?? cells });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 h-full overflow-x-auto items-start">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            records={recordsByColumn(col.id)}
            primaryField={primaryField}
            fields={fields}
            onAddCard={() => handleAddCard(col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeRecord && primaryField && (
          <KanbanCard record={activeRecord} primaryField={primaryField} fields={fields} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  col,
  records,
  primaryField,
  fields,
  onAddCard,
}: {
  col: { id: string; label: string; color: string };
  records: RecordRow[];
  primaryField: Field | undefined;
  fields: Field[];
  onAddCard: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-64 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 transition-colors',
        isOver && 'bg-indigo-50 border-indigo-300'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', col.color)}>
            {col.label}
          </span>
          <span className="text-xs text-gray-400">{records.length}</span>
        </div>
      </div>

      {/* Cards */}
      <SortableContext items={records.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 min-h-[80px]">
          {records.map((record) =>
            primaryField ? (
              <KanbanCard key={record.id} record={record} primaryField={primaryField} fields={fields} />
            ) : null
          )}
        </div>
      </SortableContext>

      {/* Add card */}
      <button
        onClick={onAddCard}
        className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-b-xl transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add card
      </button>
    </div>
  );
}

function KanbanCard({
  record,
  primaryField,
  fields,
  isDragging,
}: {
  record: RecordRow;
  primaryField: Field;
  fields: Field[];
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: record.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const title = String(record.cells[primaryField.id] ?? 'Untitled');
  // Show a couple secondary fields
  const secondaryFields = fields.filter((f) => !f.is_primary && f.type !== 'text').slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40 shadow-lg'
      )}
    >
      <p className="text-sm font-medium text-gray-800 line-clamp-2">{title || 'Untitled'}</p>
      {secondaryFields.map((f) => {
        const val = record.cells[f.id];
        if (!val) return null;
        if (f.type === 'select') {
          const choice = f.options?.choices?.find((c) => c.id === val);
          return choice ? (
            <span key={f.id} className={cn('mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium', choice.color)}>
              {choice.name}
            </span>
          ) : null;
        }
        return (
          <p key={f.id} className="mt-1 text-xs text-gray-500 truncate">{String(val)}</p>
        );
      })}
    </div>
  );
}
