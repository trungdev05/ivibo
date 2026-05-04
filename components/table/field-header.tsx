'use client';
import { useRef, useState } from 'react';
import { Field, FieldType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Type,
  Hash,
  ChevronDown,
  Calendar,
  CheckSquare,
  User,
  List,
  Zap,
} from 'lucide-react';

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  number: <Hash className="w-3 h-3" />,
  select: <ChevronDown className="w-3 h-3" />,
  multi_select: <List className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  checkbox: <CheckSquare className="w-3 h-3" />,
  user: <User className="w-3 h-3" />,
  formula: <Zap className="w-3 h-3" />,
};

interface FieldHeaderProps {
  field: Field;
  width: number;
  rowHeight?: number;
  onResize: (fieldId: string, width: number) => void;
  onRename?: (fieldId: string, name: string) => void;
}

export function FieldHeader({
  field,
  width,
  rowHeight = 40,
  onResize,
  onRename,
}: FieldHeaderProps) {
  // LarkSuite-like resize: show preview line while dragging, commit width on mouseup
  const [resizing, setResizing] = useState(false);
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideBounds, setGuideBounds] = useState<{ top: number; height: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(field.name);
  const resizeRef = useRef<{ startX: number; startWidth: number; startRight: number } | null>(null);

  function commitRename() {
    const next = draftName.trim();
    setRenaming(false);
    if (!next || next === field.name) {
      setDraftName(field.name);
      return;
    }
    onRename?.(field.id, next);
  }

  const style = {
    width,
    height: rowHeight,
    transition: resizing ? undefined : 'width 120ms ease',
  };

  function startResize(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).parentElement?.getBoundingClientRect();
    if (!rect) return;
    const gridRoot = (e.currentTarget as HTMLElement).closest('[data-table-grid-root="true"]') as HTMLElement | null;
    const rootRect = gridRoot?.getBoundingClientRect() ?? rect;
    resizeRef.current = { startX: e.clientX, startWidth: width, startRight: rect.right };
    setResizing(true);
    setGuideX(rect.right);
    setGuideBounds({ top: rootRect.top, height: rootRect.height });

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const nextX = resizeRef.current.startRight + (mv.clientX - resizeRef.current.startX);
      setGuideX(nextX);
    };

    const onUp = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const finalWidth = Math.max(60, resizeRef.current.startWidth + mv.clientX - resizeRef.current.startX);
      onResize(field.id, finalWidth); // single store update on release
      setGuideX(null);
      setGuideBounds(null);
      setResizing(false);
      resizeRef.current = null;
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div
      style={style}
      className={cn(
        'relative flex items-center gap-1.5 px-2 border-r border-gray-200 bg-gray-50',
        'text-xs font-medium text-gray-600 select-none flex-shrink-0',
        resizing ? 'cursor-col-resize' : 'cursor-default'
      )}
    >
      <div
        className="flex items-center gap-1.5 min-w-0 flex-1 h-full"
      >
        <span className="text-gray-400 flex-shrink-0">{FIELD_ICONS[field.type]}</span>
        {renaming ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftName(field.name);
                setRenaming(false);
              }
            }}
            className="flex-1 min-w-0 h-6 px-1.5 rounded border border-indigo-300 bg-white text-xs text-gray-700 outline-none"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraftName(field.name);
              setRenaming(true);
            }}
            className="truncate flex-1 text-left"
            title="Nhấp đúp để đổi tên cột"
          >
            {field.name}
          </button>
        )}
      </div>

      {/* Right edge resize handle (divider style) */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10"
        title="Kéo để thay đổi độ rộng"
      />

      {resizing && guideX !== null && guideBounds && (
        <div
          className="fixed w-0.5 bg-indigo-500 pointer-events-none z-[70]"
          style={{ left: guideX, top: guideBounds.top, height: guideBounds.height }}
        />
      )}
    </div>
  );
}
