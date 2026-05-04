'use client';
import { useState } from 'react';
import { useTableStore } from '@/store/table-store';
import { View, ViewType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterSortPanel } from './filter-sort-panel';
import { TableSettingsPanel } from './table-settings-panel';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, Plus, Grid3x3, Columns, LayoutGrid, Trash2, X } from 'lucide-react';

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Grid3x3 className="w-3.5 h-3.5" />,
  kanban: <Columns className="w-3.5 h-3.5" />,
  gallery: <LayoutGrid className="w-3.5 h-3.5" />,
};

interface TableToolbarProps {
  tableId: string;
}

export function TableToolbar({ tableId }: TableToolbarProps) {
  const {
    views,
    activeViewId,
    setActiveView,
    addView,
    init,
    search,
    setSearch,
    fields,
    records,
    selectedRecordIds,
    clearSelection,
    removeRecords,
    rowHeight,
    showRowNumbers,
    pageLimit,
    setRowHeight,
    setShowRowNumbers,
    setPageLimit,
    updateViewConfig,
    reorderFields,
    getActiveView,
  } = useTableStore();
  const [showFilters, setShowFilters] = useState(false);

  const view = getActiveView();
  const hiddenFields: string[] = (view?.config?.hiddenFields as string[] | undefined) ?? [];

  const handleToggleHideField = async (fieldId: string) => {
    if (!activeViewId) return;
    const isHidden = hiddenFields.includes(fieldId);
    const nextHidden = isHidden
      ? hiddenFields.filter((id) => id !== fieldId)
      : [...hiddenFields, fieldId];
    updateViewConfig(activeViewId, { hiddenFields: nextHidden });
    await fetch(`/api/views/${activeViewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenFields: nextHidden }),
    });
  };

  const handleReorderFields = async (orderedIds: string[]) => {
    if (!activeViewId) return;
    reorderFields(orderedIds);
    await fetch(`/api/views/${activeViewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldOrder: orderedIds }),
    });
  };

  const handleAddView = async (type: ViewType) => {
    const name = type === 'table' ? 'Bảng dữ liệu' : type === 'kanban' ? 'Kanban' : 'Thư viện';
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, name, type }),
    });
    const { data } = await res.json();
    if (data) {
      addView(data);
      setActiveView(data.id);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedRecordIds];
    if (!ids.length) return;
    await fetch('/api/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    removeRecords(ids);
    clearSelection();
  };

  return (
    <div className="flex flex-col border-b border-gray-200 bg-white flex-shrink-0">
      {/* View tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto">
        {views.map((view: View) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors whitespace-nowrap',
              activeViewId === view.id
                ? 'bg-white border-gray-200 text-indigo-600'
                : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            )}
          >
            {VIEW_ICONS[view.type]}
            {view.name}
          </button>
        ))}
        {/* Add view dropdown */}
        <div className="relative ml-1">
          <button
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            onClick={() => {
              // Simple cycle: add table view
              handleAddView('table');
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Thêm view
          </button>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Tìm kiếm bản ghi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter/Sort toggle */}
        <Button
          variant={showFilters ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc & Sắp xếp
        </Button>

        {/* Bulk actions — hiện inline khi có chọn */}
        {selectedRecordIds.size > 0 && (
          <>
            <span className="text-xs text-indigo-700 font-medium">Đã chọn {selectedRecordIds.size}</span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Bỏ chọn
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <TableSettingsPanel
            fields={fields}
            pageLimit={pageLimit}
            rowHeight={rowHeight}
            showRowNumbers={showRowNumbers}
            hiddenFields={hiddenFields}
            onChangePageLimit={setPageLimit}
            onChangeRowHeight={setRowHeight}
            onToggleRowNumbers={() => setShowRowNumbers(!showRowNumbers)}
            onToggleFieldVisibility={handleToggleHideField}
            onReorderFields={handleReorderFields}
          />
          <span className="text-xs text-gray-400">{records.length.toLocaleString()} bản ghi</span>
        </div>
      </div>

      {/* Filter/Sort panel */}
      {showFilters && (
        <div className="border-t border-gray-100">
          <FilterSortPanel />
        </div>
      )}
    </div>
  );
}
