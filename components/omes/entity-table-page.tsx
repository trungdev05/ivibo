'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Column = {
  key: string;
  label: string;
};

type EntityTablePageProps = {
  title: string;
  endpoint: string;
  columns: Column[];
  defaultForm: Record<string, string | number>;
};

export function EntityTablePage({ title, endpoint, columns, defaultForm }: EntityTablePageProps) {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>(defaultForm);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const rowsQuery = useQuery({
    queryKey: ['entity-table-page', endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load records');
      return (payload?.data ?? []) as Array<Record<string, unknown>>;
    },
  });

  const filtered = useMemo(() => {
    const rows = rowsQuery.data ?? [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rowsQuery.data, query]);

  const submit = async () => {
    setSaving(true);
    setSaveError('');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
      body: JSON.stringify(form),
    });
    const payload = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveError(payload?.error ?? 'Failed to create');
      return;
    }
    setFormOpen(false);
    setForm(defaultForm);
    setSaveError('');
    await rowsQuery.refetch();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 h-12">
        <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-60"
            placeholder="Search..."
          />
          <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Close' : 'New'}
          </Button>
        </div>
      </div>

      {formOpen && (
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-200 bg-gray-50">
          {Object.keys(defaultForm).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{key}</label>
              <Input
                value={String(form[key] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between">
            {saveError ? <p className="text-xs text-red-600">{saveError}</p> : <span />}
            <Button size="sm" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {rowsQuery.isPending ? (
          <div className="p-6 text-sm text-gray-400">Loading...</div>
        ) : rowsQuery.error ? (
          <div className="p-6 text-sm text-red-500">{(rowsQuery.error as Error).message}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={String(row.id ?? idx)} className="border-b border-gray-100 hover:bg-blue-50/30">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-gray-700 align-top">
                      {renderCell(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
