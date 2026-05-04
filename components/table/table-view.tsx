'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTableStore } from '@/store/table-store';
import { CellValue, DEFAULT_COLUMN_WIDTH, Field } from '@/lib/types';
import { FieldHeader } from './field-header';
import { CellEditor } from './cell-editor';
import { cn } from '@/lib/utils';
import { Maximize2, Plus, Trash2 } from 'lucide-react';
import { RecordDetailPanel } from './record-detail-panel';

export function TableView() {
  const {
    fields,
    selectedRecordIds,
    toggleSelectRecord,
    selectAll,
    clearSelection,
    addRecord,
    updateCell,
    removeRecords,
    addField,
    updateField,
    getVisibleRecords,
    getActiveView,
    updateViewConfig,
    tableId,
    totalRecords,
    currentPage,
    pageLimit,
    loadingMore,
    appendRecords,
    setLoadingMore,
    rowHeight,
    showRowNumbers,
    openRecordId,
    setOpenRecordId,
  } = useTableStore();

  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Auto-open detail panel when WorkBaseShell signals a deep-linked record
  useEffect(() => {
    if (!openRecordId) return;
    setExpandedRecordId(openRecordId);
    setOpenRecordId(null);
    // Scroll into view after a tick to let the panel mount
    setTimeout(() => {
      const el = rowRefs.current[openRecordId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [openRecordId, setOpenRecordId]);

  const records = getVisibleRecords();
  const expandedRecord = expandedRecordId ? records.find((r) => r.id === expandedRecordId) ?? null : null;
  const expandedRecordIdx = expandedRecordId ? records.findIndex((r) => r.id === expandedRecordId) : -1;
  const view = getActiveView();
  const columnWidths: Record<string, number> = useMemo(
    () => view?.config?.columnWidths ?? {},
    [view?.config?.columnWidths]
  );

  const hiddenFields: string[] = useMemo(
    () => view?.config?.hiddenFields ?? [],
    [view?.config?.hiddenFields]
  );

  const visibleFields = useMemo(
    () => fields.filter((field) => !hiddenFields.includes(field.id)),
    [fields, hiddenFields]
  );

  // Get row height in pixels
  const rowHeightPx = useMemo(
    () => {
      switch (rowHeight) {
        case 'compact': return 28;
        case 'large': return 52;
        case 'normal':
        default:
          return 40;
      }
    },
    [rowHeight]
  );

  const hasMore = records.length < totalRecords;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: fetch next page from API when sentinel is visible
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && tableId) {
          const nextPage = currentPage + 1;
          setLoadingMore(true);
          fetch(`/api/tables/${tableId}?page=${nextPage}&limit=${pageLimit}`)
            .then((r) => r.json())
            .then(({ data }) => {
              if (data?.records) {
                appendRecords(data.records, nextPage, data.total ?? totalRecords);
              } else {
                setLoadingMore(false);
              }
            })
            .catch(() => setLoadingMore(false));
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, tableId, currentPage, pageLimit, totalRecords, appendRecords, setLoadingMore]);

  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  // Track latest cell value during editing to avoid stale closures in onBlur
  const pendingCellValue = useRef<CellValue>(null);
  // Track newly added record to auto-scroll + auto-focus
  const newRecordIdRef = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle column resize
  const handleResize = useCallback(
    (fieldId: string, width: number) => {
      if (!view) return;
      const next = { ...columnWidths, [fieldId]: width };
      updateViewConfig(view.id, { columnWidths: next });
      // Debounced save
      clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        fetch(`/api/views/${view.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...view.config, columnWidths: next } }),
        });
      }, 400);
    },
    [view, columnWidths, updateViewConfig]
  );
  const resizeTimer = useRef<number>(0);

  // Auto-scroll + auto-focus when a new record is added
  useEffect(() => {
    const id = newRecordIdRef.current;
    if (!id) return;
    const el = rowRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Auto-focus first editable cell
      const firstField = visibleFields.find((f) => f.type !== 'checkbox');
      if (firstField) setEditingCell({ recordId: id, fieldId: firstField.id });
      newRecordIdRef.current = null;
    }
  }, [records, visibleFields]);

  // Add new record
  const handleAddRecord = async () => {
    if (!tableId) return;
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, cells: {} }),
    });
    const { data } = await res.json();
    if (data) {
      addRecord({ ...data, cells: data.cells ?? {} });
      newRecordIdRef.current = data.id;
    }
  };

  // Add new field
  const handleAddField = async () => {
    if (!tableId) return;
    const name = `Cột ${fields.length + 1}`;
    const res = await fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, name, type: 'text' }),
    });
    const { data } = await res.json();
    if (data) addField(data);
  };

  const handleRenameField = useCallback(
    async (fieldId: string, name: string) => {
      updateField(fieldId, { name });
      await fetch(`/api/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    },
    [updateField]
  );


  // Auto-save cell
  const handleCellChange = useCallback(
    (recordId: string, fieldId: string, value: CellValue) => {
      pendingCellValue.current = value;
      updateCell(recordId, fieldId, value);
    },
    [updateCell]
  );

  const handleCellBlur = useCallback(
    (recordId: string, fieldId: string) => {
      const value = pendingCellValue.current;
      fetch(`/api/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: { [fieldId]: value } }),
      });
      pendingCellValue.current = null;
      setEditingCell(null);
    },
    []
  );

  // Toggle checkbox directly without entering edit mode
  const handleCheckboxToggle = useCallback(
    (recordId: string, fieldId: string, currentValue: CellValue) => {
      const next = !currentValue;
      updateCell(recordId, fieldId, next);
      fetch(`/api/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: { [fieldId]: next } }),
      });
    },
    [updateCell]
  );

  // Bulk delete
  const handleBulkDelete = async () => {
    const ids = [...selectedRecordIds];
    removeRecords(ids);
    await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  };

  const allSelected = records.length > 0 && records.every((r) => selectedRecordIds.has(r.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto relative" data-table-grid-root="true">
        <div className="inline-flex flex-col min-w-full min-h-full">
          {/* Header row */}
          <div className="flex sticky top-0 z-10 border-b border-gray-200" style={{ height: rowHeightPx }}>
            {/* Row selector header */}
            <div className="w-10 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: rowHeightPx }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => (allSelected ? clearSelection() : selectAll())}
                className="accent-indigo-600"
              />
            </div>
            {/* Row index header */}
            {showRowNumbers && (
              <div className="w-10 flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ height: rowHeightPx }} />
            )}
            {visibleFields.map((field) => (
              <FieldHeader
                key={field.id}
                field={field}
                width={columnWidths[field.id] ?? DEFAULT_COLUMN_WIDTH}
                rowHeight={rowHeightPx}
                onResize={handleResize}
                onRename={handleRenameField}
              />
            ))}
            {/* Add field button */}
            <button
              onClick={handleAddField}
              className="flex items-center justify-center w-9 border-r border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Thêm cột"
              style={{ height: rowHeightPx }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Data rows */}
          {records.map((record, rowIdx) => (
            <div
              key={record.id}
              ref={(el) => { rowRefs.current[record.id] = el; }}
              className={cn(
                'flex border-b border-gray-100 hover:bg-blue-50/30 group',
                selectedRecordIds.has(record.id) && 'bg-indigo-50'
              )}
              style={{ height: rowHeightPx }}
            >
              {/* Checkbox */}
              <div className="w-10 flex-shrink-0 border-r border-gray-200 flex items-center justify-center relative group/row">
                <input
                  type="checkbox"
                  checked={selectedRecordIds.has(record.id)}
                  onChange={() => toggleSelectRecord(record.id)}
                  className="accent-indigo-600"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedRecordId(record.id); }}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover/row:opacity-100 transition-all"
                  title="Mở chi tiết"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
              {/* Row index */}
              {showRowNumbers && (
                <div className="w-10 flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-xs text-gray-400">
                  {rowIdx + 1}
                </div>
              )}
              {/* Cells */}
              {visibleFields.map((field) => {
                const cellWidth = columnWidths[field.id] ?? DEFAULT_COLUMN_WIDTH;
                const isEditing =
                  editingCell?.recordId === record.id && editingCell?.fieldId === field.id;
                const value = record.cells[field.id] ?? null;

                const isCheckbox = field.type === 'checkbox';

                return (
                  <div
                    key={field.id}
                    style={{ width: cellWidth }}
                    onClick={() => {
                      if (isCheckbox) {
                        handleCheckboxToggle(record.id, field.id, value);
                      } else {
                        setEditingCell({ recordId: record.id, fieldId: field.id });
                      }
                    }}
                    className={cn(
                      'flex-shrink-0 border-r border-gray-100 h-9 flex items-center overflow-hidden relative',
                      isCheckbox ? 'cursor-pointer' : '',
                      isEditing ? 'ring-2 ring-inset ring-indigo-500 z-10' : ''
                    )}
                  >
                    {isEditing ? (
                      <CellEditor
                        field={field}
                        value={value}
                        onChange={(v) => handleCellChange(record.id, field.id, v)}
                        onBlur={() => handleCellBlur(record.id, field.id)}
                        autoFocus
                      />
                    ) : (
                      <CellReadonly field={field} value={value} />
                    )}
                  </div>
                );
              })}
              <div className="flex-1" />
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center h-10 text-xs text-gray-400 mb-2">
              {loadingMore ? 'Đang tải thêm…' : ''}
            </div>
          )}

          {/* Add record row */}
          <div
            className="sticky bottom-0 z-20 flex items-center border-t border-gray-200 bg-white/95 backdrop-blur-sm cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-gray-700 group"
            onClick={handleAddRecord}
            style={{ height: rowHeightPx }}
          >
            <div className="w-10 flex-shrink-0 border-r border-gray-200" />
            {showRowNumbers && (
              <div className="w-10 flex-shrink-0 border-r border-gray-200" />
            )}
            <div className="w-10 flex-shrink-0 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="px-3 text-sm">Thêm bản ghi</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center px-4 h-10 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <span>Hiển thị {records.length.toLocaleString()} / {totalRecords.toLocaleString()} bản ghi</span>
      </div>

      {/* Record detail panel */}
      {expandedRecord && (
        <RecordDetailPanel
          record={expandedRecord}
          fields={visibleFields}
          recordIndex={expandedRecordIdx}
          totalRecords={records.length}
          tableId={tableId ?? ''}
          onClose={() => setExpandedRecordId(null)}
          onNavigate={(dir) => {
            const nextIdx = expandedRecordIdx + dir;
            if (nextIdx >= 0 && nextIdx < records.length) setExpandedRecordId(records[nextIdx].id);
          }}
          onCellChange={handleCellChange}
          onCellBlur={handleCellBlur}
        />
      )}
    </div>
  );
}

// Read-only cell display
function CellReadonly({ field, value }: { field: Field; value: CellValue }) {
  if (value === null || value === undefined) return <span className="px-2 text-sm text-gray-300">—</span>;
  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <input type="checkbox" readOnly checked={!!value} className="accent-indigo-600" />
      </div>
    );
  }
  if (field.type === 'select') {
    const choice = field.options?.choices?.find((c) => c.id === value);
    return choice ? (
      <span className={cn('mx-1.5 px-2 py-0.5 rounded-full text-xs font-medium', choice.color)}>
        {choice.name}
      </span>
    ) : null;
  }
  if (field.type === 'multi_select' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1 px-1.5 items-center">
        {(value as string[]).map((id) => {
          const c = field.options?.choices?.find((x) => x.id === id);
          return c ? (
            <span key={id} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', c.color)}>
              {c.name}
            </span>
          ) : null;
        })}
      </div>
    );
  }
  if (field.type === 'date' && typeof value === 'string') {
    return <span className="px-2 text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>;
  }
  return <span className="px-2 text-sm text-gray-700 truncate">{String(value)}</span>;
}
