'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function MetricCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'danger' | 'warn' | 'success' }) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50'
        : tone === 'success'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-gray-200 bg-white';

  return (
    <div className={cn('rounded-xl border p-4', toneClass)}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const labelMap: Record<string, string> = {
    red: 'Nguy hiểm',
    orange: 'Cần chú ý',
    yellow: 'Theo dõi',
    green: 'Tốt',
  };

  const className =
    lower.includes('red') || lower.includes('breach') || lower.includes('delayed')
      ? 'bg-red-100 text-red-700'
      : lower.includes('orange') || lower.includes('high') || lower.includes('blocked')
        ? 'bg-orange-100 text-orange-700'
        : lower.includes('yellow') || lower.includes('watch')
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-emerald-100 text-emerald-700';

  const label = labelMap[lower] ?? value;

  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', className)}>{label}</span>;
}

// ── SearchableSelect ──────────────────────────────────────────────────────────
export type SelectOption = { value: string; label: string };

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selected = options.find((opt) => opt.value === value);
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((opt) => opt.label.toLowerCase().includes(normalized))
    : options;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => { setOpen((prev) => !prev); setQuery(''); }}
        className="w-full min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <span className="block truncate">{selected?.label ?? placeholder}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">Không có kết quả</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value || '__empty'}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`block w-full px-3 py-2 text-left text-xs hover:bg-blue-50 ${value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
