'use client';

/**
 * components/views/view-switcher.tsx
 * Tab bar for switching between Grid / Kanban / Gallery views.
 */

import { LayoutGrid, Columns, LayoutList } from 'lucide-react';

export type ViewMode = 'grid' | 'kanban' | 'gallery';

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  available?: ViewMode[];
}

const VIEWS: { key: ViewMode; label: string; Icon: React.ElementType }[] = [
  { key: 'grid', label: 'Bảng', Icon: LayoutList },
  { key: 'kanban', label: 'Kanban', Icon: Columns },
  { key: 'gallery', label: 'Thẻ', Icon: LayoutGrid },
];

export function ViewSwitcher({ view, onChange, available = ['grid', 'kanban', 'gallery'] }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
      {VIEWS.filter((v) => available.includes(v.key)).map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            view === key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
