'use client';

/**
 * components/views/kanban-view.tsx
 * Generic drag-and-drop Kanban board using @dnd-kit.
 */

import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface KanbanColumn<T> {
  id: string;
  label: string;
  color?: string; // hex or tailwind class fragment
  items: T[];
}

interface CardProps<T> {
  id: string;
  item: T;
  renderCard: (item: T) => React.ReactNode;
}

function SortableCard<T>({ id, item, renderCard }: CardProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="group rounded-lg border bg-background shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">{renderCard(item)}</div>
      </div>
    </div>
  );
}

interface KanbanViewProps<T extends { id: string }> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  onMoveItem?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  columnWidth?: number;
}

export function KanbanView<T extends { id: string }>({
  columns,
  renderCard,
  onMoveItem,
  columnWidth = 280,
}: KanbanViewProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const findColumn = (itemId: string) =>
    columns.find((col) => col.items.some((item) => item.id === itemId));

  const findItem = (itemId: string): T | undefined => {
    for (const col of columns) {
      const found = col.items.find((i) => i.id === itemId);
      if (found) return found;
    }
  };

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(active.id as string);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const fromCol = findColumn(active.id as string);
    // over could be a column id or another card id
    const toCol = columns.find((c) => c.id === over.id) ?? findColumn(over.id as string);

    if (!fromCol || !toCol) return;
    if (fromCol.id !== toCol.id) {
      onMoveItem?.(active.id as string, fromCol.id, toCol.id);
    }
  };

  const activeItem = activeId ? findItem(activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            style={{ minWidth: columnWidth, width: columnWidth }}
            className="flex flex-col gap-2"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color ?? '#94a3b8' }}
                />
                <span className="text-sm font-semibold">{col.label}</span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{col.items.length}</span>
            </div>

            {/* Drop zone */}
            <SortableContext items={col.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div
                data-col-id={col.id}
                className="flex flex-col gap-2 min-h-[80px] rounded-lg bg-muted/30 p-2"
              >
                {col.items.map((item) => (
                  <SortableCard key={item.id} id={item.id} item={item} renderCard={renderCard} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="rounded-lg border bg-background shadow-xl p-3 opacity-90">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
