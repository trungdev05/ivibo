'use client';

/**
 * components/views/gallery-view.tsx
 * Generic card grid (Gallery) view.
 */

import { Search } from 'lucide-react';
import { useState } from 'react';

interface Props<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  searchPlaceholder?: string;
  getSearchText?: (item: T) => string;
  columns?: 2 | 3 | 4;
}

const COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function GalleryView<T>({ data, renderCard, searchPlaceholder = 'Tìm kiếm...', getSearchText, columns = 3 }: Props<T>) {
  const [query, setQuery] = useState('');

  const filtered = query && getSearchText
    ? data.filter((item) => getSearchText(item).toLowerCase().includes(query.toLowerCase()))
    : data;

  return (
    <div className="flex flex-col gap-4">
      {getSearchText && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Không có dữ liệu
        </div>
      ) : (
        <div className={`grid gap-4 ${COLS_CLASS[columns]}`}>
          {filtered.map((item, i) => (
            <div key={i}>{renderCard(item, i)}</div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} / {data.length} mục
      </p>
    </div>
  );
}
