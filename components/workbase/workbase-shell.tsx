'use client';

import { useEffect, useState } from 'react';
import { useTableStore } from '@/store/table-store';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { TableToolbar } from '@/components/table/table-toolbar';
import { TableView } from '@/components/table/table-view';
import { KanbanView } from '@/components/table/kanban-view';
import { GalleryView } from '@/components/table/gallery-view';
import { ViewType } from '@/lib/types';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type WorkBaseShellProps = {
  baseId: string;
  tableId: string;
  hideBreadcrumb?: boolean;
  /** If provided, auto-opens the detail panel for the WorkBase record linked to this task ID. */
  openTaskId?: string;
};

export function WorkBaseShell({ baseId, tableId, hideBreadcrumb = false, openTaskId }: WorkBaseShellProps) {
  const { init, getActiveView, tableId: storeTableId, tableName, setOpenRecordId } = useTableStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseName, setBaseName] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tableRes, baseRes] = await Promise.all([
          fetch(`/api/tables/${tableId}?page=1&limit=50`),
          fetch(`/api/bases/${baseId}`),
        ]);
        const tablePayload = await tableRes.json();
        const basePayload = await baseRes.json();

        if (!tableRes.ok) throw new Error(tablePayload?.error ?? 'Table not found');
        if (!baseRes.ok) throw new Error(basePayload?.error ?? 'Base not found');

        const data = tablePayload?.data;
        const baseData = basePayload?.data;
        if (!data) throw new Error('Table not found');
        init(data.table.id, data.table.name, data.fields, data.records, data.views, data.total ?? data.records.length, data.page ?? 1, data.limit ?? 50);
        setBaseName(baseData?.name ?? 'WorkBase');

        // Auto-open detail panel for deep-linked task
        if (openTaskId) {
          const taskIdField = (data.fields as Array<{ id: string; name: string }>).find((f) => f.name === '_taskId');
          if (taskIdField) {
            const matched = (data.records as Array<{ id: string; cells: Record<string, unknown> }>).find(
              (r) => r.cells[taskIdField.id] === openTaskId
            );
            if (matched) setOpenRecordId(matched.id);
          }
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tableId, baseId, init]);

  useRealtimeTable(storeTableId);

  const activeView = getActiveView();
  const viewType: ViewType = activeView?.type ?? 'table';

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading WorkBase...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading WorkBase</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white">
      {!hideBreadcrumb && (
        <header className="flex items-center gap-2 px-4 h-11 border-b border-gray-200 bg-white flex-shrink-0 text-sm">
          <Link href="/omes/work" className="text-gray-500 hover:text-indigo-600 transition-colors">
            Work Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-500">{baseName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="font-semibold text-gray-800">{tableName}</span>
        </header>
      )}
      <TableToolbar tableId={tableId} />
      <div className="flex-1 overflow-hidden">
        {viewType === 'table' && <TableView />}
        {viewType === 'kanban' && <KanbanView />}
        {viewType === 'gallery' && <GalleryView />}
      </div>
    </div>
  );
}
