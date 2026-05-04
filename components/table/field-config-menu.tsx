'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Field, FieldType } from '@/lib/types';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { MoreVertical, Trash2, Eye, EyeOff, Type, Hash, Calendar, CheckSquare, List } from 'lucide-react';

interface FieldConfigMenuProps {
  field: Field;
  isHidden?: boolean;
  onRename: (name: string) => void;
  onChangeType: (type: FieldType) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Văn bản', icon: <Type className="w-3 h-3" /> },
  { type: 'number', label: 'Số', icon: <Hash className="w-3 h-3" /> },
  { type: 'date', label: 'Ngày', icon: <Calendar className="w-3 h-3" /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-3 h-3" /> },
  { type: 'select', label: 'Lựa chọn', icon: <List className="w-3 h-3" /> },
  { type: 'multi_select', label: 'Nhiều lựa chọn', icon: <List className="w-3 h-3" /> },
];

export function FieldConfigMenu({ field, isHidden, onRename, onChangeType, onToggleHidden, onDelete }: FieldConfigMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [renameDraft, setRenameDraft] = useState(field.name);
  const [renaming, setRenaming] = useState(false);

  // Position menu below trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const handleCommitRename = useCallback(() => {
    const next = renameDraft.trim();
    if (next && next !== field.name) {
      onRename(next);
    } else {
      setRenameDraft(field.name);
    }
    setRenaming(false);
  }, [renameDraft, field.name, onRename]);

  const handleChangeType = (type: FieldType) => {
    if (type !== field.type) {
      onChangeType(type);
    }
    setOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa cột "${field.name}"?`)) {
      onDelete();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 transition-all"
        title="Cấu hình cột"
      >
        <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9998 }}
          className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-max"
        >
          {/* Rename section */}
          {renaming ? (
            <div className="px-3 py-2 border-b border-gray-100">
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={handleCommitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitRename();
                  if (e.key === 'Escape') {
                    setRenameDraft(field.name);
                    setRenaming(false);
                  }
                }}
                className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setRenameDraft(field.name);
                setRenaming(true);
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
            >
              ✏️ Đổi tên: <span className="font-medium">{field.name}</span>
            </button>
          )}

          {/* Change type section */}
          <div className="border-t border-gray-100">
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500">Loại cột:</div>
            <div className="grid grid-cols-2 gap-0.5 px-2 py-1.5">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleChangeType(t.type)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                    field.type === t.type
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-600'
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle hidden section */}
          <button
            onClick={() => {
              onToggleHidden();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 border-t border-gray-100 transition-colors"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isHidden ? 'Hiện cột' : 'Ẩn cột'}
          </button>

          {/* Delete section */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa cột
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
