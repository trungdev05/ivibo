'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CellValue, Field, SelectOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, X, Search } from 'lucide-react';

interface CellEditorProps {
  field: Field;
  value: CellValue;
  onChange: (v: CellValue) => void;
  onBlur: () => void;
  autoFocus?: boolean;
}

// ─── Custom select / multi-select dropdown ───────────────────

interface SelectDropdownProps {
  choices: SelectOption[];
  selected: string[];
  multi: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

function SelectDropdown({ choices, selected, multi, triggerRef, onChange, onClose }: SelectDropdownProps) {
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Position below trigger cell
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= panelHeight ? rect.bottom + 2 : rect.top - panelHeight - 2;
    setPos({ top, left: rect.left, width: Math.max(rect.width, 200) });
  }, [triggerRef]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, triggerRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = choices.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    if (multi) {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      onChange(next);
    } else {
      onChange(selected[0] === id ? [] : [id]);
      onClose();
    }
  };

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Search */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          autoFocus
          placeholder="Tìm lựa chọn…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent text-gray-700"
        />
      </div>
      {/* Clear option for single select */}
      {!multi && selected.length > 0 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); onChange([]); onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50"
        >
          <X className="w-3.5 h-3.5" />
          Bỏ chọn
        </button>
      )}
      {/* Options list */}
      <div className="overflow-y-auto max-h-48">
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-400">Không có kết quả</p>
        )}
        {filtered.map((c) => {
          const active = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); toggle(c.id); }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 text-left transition-colors',
                active && 'bg-indigo-50'
              )}
            >
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-1 text-left', c.color)}>
                {c.name}
              </span>
              {active && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      {/* Multi-select footer */}
      {multi && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-500">{selected.length} đã chọn</span>
          <button
            onMouseDown={(e) => { e.preventDefault(); onClose(); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Xong
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Select editor (single) ──────────────────────────────────

function SelectEditor({ field, value, onChange, onBlur }: Omit<CellEditorProps, 'autoFocus'>) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLDivElement>(null);
  const choices = (field.options?.choices ?? []) as SelectOption[];
  const selectedId = typeof value === 'string' ? value : null;
  const choice = choices.find((c) => c.id === selectedId);

  const handleClose = useCallback(() => {
    setOpen(false);
    onBlur();
  }, [onBlur]);

  const handleChange = useCallback((ids: string[]) => {
    onChange(ids[0] ?? null);
  }, [onChange]);

  return (
    <div ref={triggerRef} className="w-full h-full flex items-center px-1.5 cursor-pointer">
      {choice ? (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', choice.color)}>{choice.name}</span>
      ) : (
        <span className="text-sm text-gray-300">—</span>
      )}
      {open && (
        <SelectDropdown
          choices={choices}
          selected={selectedId ? [selectedId] : []}
          multi={false}
          triggerRef={triggerRef}
          onChange={handleChange}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

// ─── Multi-select editor ─────────────────────────────────────

function MultiSelectEditor({ field, value, onChange, onBlur }: Omit<CellEditorProps, 'autoFocus'>) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLDivElement>(null);
  const choices = (field.options?.choices ?? []) as SelectOption[];
  const selectedIds = Array.isArray(value) ? (value as string[]) : [];

  const handleClose = useCallback(() => {
    setOpen(false);
    onBlur();
  }, [onBlur]);

  const handleChange = useCallback((ids: string[]) => {
    onChange(ids.length ? ids : null);
  }, [onChange]);

  return (
    <div ref={triggerRef} className="w-full h-full flex items-center gap-1 px-1.5 overflow-hidden cursor-pointer">
      {selectedIds.length === 0 && <span className="text-sm text-gray-300">—</span>}
      {selectedIds.slice(0, 3).map((id) => {
        const c = choices.find((x) => x.id === id);
        return c ? (
          <span key={id} className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', c.color)}>
            {c.name}
          </span>
        ) : null;
      })}
      {selectedIds.length > 3 && (
        <span className="text-xs text-gray-400 flex-shrink-0">+{selectedIds.length - 3}</span>
      )}
      {open && (
        <SelectDropdown
          choices={choices}
          selected={selectedIds}
          multi={true}
          triggerRef={triggerRef}
          onChange={handleChange}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

// ─── Main CellEditor ─────────────────────────────────────────

export function CellEditor({ field, value, onChange, onBlur, autoFocus }: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const baseInput =
    'w-full h-full px-2 text-sm bg-white border-none outline-none text-gray-800';

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <input
          type="checkbox"
          checked={!!value}
          autoFocus={autoFocus}
          onChange={(e) => { onChange(e.target.checked); onBlur(); }}
          className="accent-indigo-600 cursor-pointer"
        />
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        className={baseInput}
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        className={baseInput}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === 'select') {
    return <SelectEditor field={field} value={value} onChange={onChange} onBlur={onBlur} />;
  }

  if (field.type === 'multi_select') {
    return <MultiSelectEditor field={field} value={value} onChange={onChange} onBlur={onBlur} />;
  }

  // Default: text / user / formula
  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      className={baseInput}
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      onBlur={onBlur}
    />
  );
}

