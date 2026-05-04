'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ColDef<T> {
  key: string;
  header: string;
  /** Initial column width in px. Defaults to 120. */
  defaultWidth?: number;
  /** Minimum width during resize in px. Defaults to 60. */
  minWidth?: number;
  /** Show sort arrows and enable click-to-sort. */
  sortable?: boolean;
  /** Return a comparable primitive for sorting. Required when sortable=true. */
  sortValue?: (row: T) => string | number;
  /** Text alignment. Defaults to 'left'. */
  align?: 'left' | 'right';
  /** Prevent this column from being dragged/reordered (e.g., action columns). */
  noDrag?: boolean;
  render: (row: T) => React.ReactNode;
}

interface SmartTableProps<T> {
  columns: ColDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  /** Optional footer node rendered below the table (inside the card border). */
  footer?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SmartTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  footer,
}: SmartTableProps<T>) {
  const [colOrder, setColOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    columns.forEach((c) => { m[c.key] = c.defaultWidth ?? 120; });
    return m;
  });
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const colMap = useMemo(() => {
    const m = new Map<string, ColDef<T>>();
    columns.forEach((c) => m.set(c.key, c));
    return m;
  }, [columns]);

  const orderedCols = colOrder.map((k) => colMap.get(k)).filter(Boolean) as ColDef<T>[];

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = colMap.get(sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'vi', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, colMap]);

  const handleSort = (key: string) => {
    if (!colMap.get(key)?.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent, key: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { key, startX: e.clientX, startW: colWidths[key] ?? 120 };

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const { key: k, startX, startW } = resizeRef.current;
        const min = colMap.get(k)?.minWidth ?? 60;
        setColWidths((prev) => ({ ...prev, [k]: Math.max(min, startW + ev.clientX - startX) }));
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [colWidths, colMap]
  );

  // ── Drag reorder ──────────────────────────────────────────────────────────
  const dragKey = useRef<string | null>(null);

  const handleDragStart = (key: string) => { dragKey.current = key; };
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (dragKey.current && dragKey.current !== key) setDragOver(key);
  };
  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOver(null);
    const src = dragKey.current;
    dragKey.current = null;
    if (!src || src === targetKey) return;
    if (colMap.get(targetKey)?.noDrag || colMap.get(src)?.noDrag) return;
    setColOrder((prev) => {
      const next = [...prev];
      const si = next.indexOf(src);
      const ti = next.indexOf(targetKey);
      next.splice(si, 1);
      next.splice(ti, 0, src);
      return next;
    });
  };
  const handleDragEnd = () => { dragKey.current = null; setDragOver(null); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${orderedCols.reduce((s, c) => s + (colWidths[c.key] ?? 120), 0)}px`, minWidth: '100%' }}>
          <colgroup>
            {orderedCols.map((col) => (
              <col key={col.key} style={{ width: `${colWidths[col.key] ?? 120}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {orderedCols.map((col) => {
                const isSorted = sort?.key === col.key;
                const isDragTarget = dragOver === col.key;
                return (
                  <th
                    key={col.key}
                    className={[
                      'relative px-4 py-3 font-medium select-none whitespace-nowrap overflow-hidden',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.sortable ? 'cursor-pointer' : '',
                      !col.noDrag ? 'cursor-grab active:cursor-grabbing' : '',
                      isDragTarget ? 'bg-blue-100' : 'text-gray-500 hover:bg-gray-100',
                    ].join(' ')}
                    draggable={!col.noDrag}
                    onDragStart={() => handleDragStart(col.key)}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDrop={(e) => handleDrop(e, col.key)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSort(col.key)}
                    title={col.noDrag ? undefined : 'Kéo để đổi thứ tự cột'}
                  >
                    <span className="flex items-center gap-1">
                      <span className="truncate">{col.header}</span>
                      {col.sortable && (
                        <span className="inline-flex flex-col gap-px shrink-0 ml-0.5">
                          <svg viewBox="0 0 8 5" className={`h-2 w-2 ${isSorted && sort?.dir === 'asc' ? 'text-blue-500' : 'text-gray-300'}`} fill="currentColor"><path d="M4 0 8 5H0z" /></svg>
                          <svg viewBox="0 0 8 5" className={`h-2 w-2 ${isSorted && sort?.dir === 'desc' ? 'text-blue-500' : 'text-gray-300'}`} fill="currentColor"><path d="M4 5 0 0h8z" /></svg>
                        </span>
                      )}
                    </span>
                    {/* Resize handle */}
                    <span
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300/70 active:bg-blue-400/80 z-10"
                      onMouseDown={(e) => startResize(e, col.key)}
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.stopPropagation()}
                      draggable={false}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-b border-gray-100 last:border-none hover:bg-gray-50 ${rowClassName?.(row) ?? ''}`}
              >
                {orderedCols.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 overflow-hidden ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          {footer}
        </div>
      )}
    </div>
  );
}
