'use client';
import { useRef, useEffect, useState } from 'react';
import { Field } from '@/lib/types';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Settings, Eye, EyeOff, GripVertical, X } from 'lucide-react';

interface TableSettingsPanelProps {
  fields: Field[];
  pageLimit: number;
  rowHeight: 'compact' | 'normal' | 'large';
  showRowNumbers: boolean;
  hiddenFields?: string[];
  onChangePageLimit: (limit: number) => void;
  onChangeRowHeight: (height: 'compact' | 'normal' | 'large') => void;
  onToggleRowNumbers: () => void;
  onToggleFieldVisibility: (fieldId: string) => void;
  onReorderFields: (orderedIds: string[]) => void;
}

const ROW_HEIGHT_OPTIONS = [
  { value: 'compact', label: 'Gọn', px: 28 },
  { value: 'normal', label: 'Bình thường', px: 40 },
  { value: 'large', label: 'Rộng', px: 52 },
] as const;

const PAGE_LIMIT_OPTIONS = [50, 100, 200, 500];

export function TableSettingsPanel({
  fields,
  pageLimit,
  rowHeight,
  showRowNumbers,
  hiddenFields = [],
  onChangePageLimit,
  onChangeRowHeight,
  onToggleRowNumbers,
  onToggleFieldVisibility,
  onReorderFields,
}: TableSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'display' | 'columns'>('display');
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [fieldOrder, setFieldOrder] = useState<string[]>(fields.map((f) => f.id));
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync fieldOrder when fields change
  useEffect(() => {
    setFieldOrder(fields.map((f) => f.id));
  }, [fields]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
        title="Cài đặt chung"
      >
        <Settings size={16} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9998] bg-black/30 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-full max-w-[560px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tab header */}
            <div className="flex items-center border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setTab('display')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-semibold transition-colors',
                  tab === 'display'
                    ? 'bg-white text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Hiển thị
              </button>
              <button
                onClick={() => setTab('columns')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-semibold transition-colors',
                  tab === 'columns'
                    ? 'bg-white text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Cột
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mr-2 p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {tab === 'display' ? (
                <>
                  {/* Page Limit Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Records trên trang</div>
                    <div className="flex flex-col gap-1">
                      {PAGE_LIMIT_OPTIONS.map((limit) => (
                        <button
                          key={limit}
                          onClick={() => {
                            onChangePageLimit(limit);
                          }}
                          className={cn(
                            'w-full px-2 py-1.5 text-xs rounded transition-colors text-left',
                            pageLimit === limit
                              ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-300'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          )}
                        >
                          {limit}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row Height Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Chiều cao row</div>
                    <div className="flex flex-col gap-1">
                      {ROW_HEIGHT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => onChangeRowHeight(opt.value)}
                          className={cn(
                            'text-left px-2 py-1.5 text-xs rounded transition-colors',
                            rowHeight === opt.value
                              ? 'bg-indigo-100 text-indigo-700 font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Show Row Numbers */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">Hiển thị số thứ tự</label>
                    <input
                      type="checkbox"
                      checked={showRowNumbers}
                      onChange={onToggleRowNumbers}
                      className="accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Column Visibility & Reorder Section */}
                  <div className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {fieldOrder.map((fieldId) => {
                        const field = fields.find((f) => f.id === fieldId);
                        if (!field) return null;
                        const isHidden = hiddenFields.includes(fieldId);
                        return (
                          <div
                            key={fieldId}
                            draggable
                            onDragStart={() => setDraggedField(fieldId)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (!draggedField || draggedField === fieldId) return;
                              const dragIdx = fieldOrder.indexOf(draggedField);
                              const dropIdx = fieldOrder.indexOf(fieldId);
                              const next = [...fieldOrder];
                              [next[dragIdx], next[dropIdx]] = [next[dropIdx], next[dragIdx]];
                              setFieldOrder(next);
                              onReorderFields(next);
                            }}
                            onDragEnd={() => setDraggedField(null)}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors cursor-grab active:cursor-grabbing',
                              draggedField === fieldId
                                ? 'bg-indigo-100 border border-indigo-300'
                                : 'hover:bg-gray-50 border border-transparent'
                            )}
                          >
                            <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <button
                              type="button"
                              onClick={() => onToggleFieldVisibility(fieldId)}
                              className="flex items-center gap-1 flex-1 text-left"
                            >
                              {isHidden ? (
                                <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              ) : (
                                <Eye className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                              )}
                              <span className={isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}>
                                {field.name}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end px-4 py-3 border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
