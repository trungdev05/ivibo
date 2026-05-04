'use client';

import { useCallback } from 'react';
import { useIssues, useUpdateIssue } from '@/hooks/use-issues';
import { ViewSwitcher } from '@/components/views/view-switcher';
import { GridView } from '@/components/views/grid-view';
import { KanbanView, type KanbanColumn } from '@/components/views/kanban-view';
import { GalleryView } from '@/components/views/gallery-view';
import { useViewStore, type ViewMode } from '@/store/view-store';
import type { Issue } from '@/lib/omes-types';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Bug, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

const SEV_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

function SevBadge({ sev }: { sev: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV_COLORS[sev] ?? 'bg-muted text-muted-foreground'}`}>{sev}</span>;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-purple-100 text-purple-700',
  Doing: 'bg-purple-100 text-purple-700',
  Done: 'bg-green-100 text-green-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
  'SLA Breached': 'bg-red-100 text-red-700',
  Reopened: 'bg-orange-100 text-orange-700',
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

const KANBAN_COLS: { id: string; label: string; color: string }[] = [
  { id: 'Open', label: 'Open', color: '#3b82f6' },
  { id: 'In Progress', label: 'In Progress', color: '#a855f7' },
  { id: 'Done', label: 'Done', color: '#22c55e' },
  { id: 'SLA Breached', label: 'SLA Breached', color: '#ef4444' },
  { id: 'Closed', label: 'Closed', color: '#94a3b8' },
];

const GRID_COLUMNS: ColumnDef<Issue>[] = [
  { accessorKey: 'issueCode', header: 'ID', size: 110 },
  { accessorKey: 'issueType', header: 'Loại', size: 160 },
  { accessorKey: 'severity', header: 'Mức độ', size: 110, cell: ({ getValue }) => <SevBadge sev={getValue<string>()} /> },
  { accessorKey: 'priority', header: 'Ưu tiên', size: 90 },
  { accessorKey: 'status', header: 'Trạng thái', size: 130, cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  { accessorKey: 'owner', header: 'Phụ trách', size: 130 },
  { accessorKey: 'dueDate', header: 'Due Date', size: 110, cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()?.slice(0, 10)}</span> },
  { accessorKey: 'description', header: 'Mô tả', cell: ({ getValue }) => <span className="line-clamp-1 max-w-[260px] text-muted-foreground">{getValue<string>()}</span> },
];

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {issue.issueType === 'Bug' ? <Bug className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        <span>{issue.issueCode}</span>
        <span className="ml-auto">{issue.issueType}</span>
      </div>
      <p className="text-sm font-medium line-clamp-2">{issue.description || '(No description)'}</p>
      <div className="flex items-center justify-between">
        <SevBadge sev={issue.severity} />
        <span className="text-xs text-muted-foreground">{issue.owner}</span>
      </div>
      {issue.dueDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {issue.dueDate?.slice(0, 10)}
        </div>
      )}
    </div>
  );
}

function IssueGalleryCard({ issue }: { issue: Issue }) {
  return (
    <div className="rounded-xl border bg-background p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">{issue.issueCode}</span>
        <StatusBadge status={issue.status} />
      </div>
      <p className="text-sm font-semibold line-clamp-2">{issue.description || '(No description)'}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <SevBadge sev={issue.severity} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{issue.priority}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
        <span>{issue.issueType}</span>
        <span>{issue.owner}</span>
      </div>
    </div>
  );
}

export default function IssuesPage() {
  const { getView, setView } = useViewStore();
  const view = getView('issues') as ViewMode;
  const { data, isLoading, isError, refetch } = useIssues();
  const { mutate: updateIssue } = useUpdateIssue();

  const issues: Issue[] = data?.data ?? data ?? [];

  const kanbanColumns: KanbanColumn<Issue>[] = KANBAN_COLS.map((col) => ({
    ...col,
    items: issues.filter((i) => {
      if (col.id === 'In Progress') return i.status === 'In Progress' || i.status === 'Doing';
      if (col.id === 'Done') return i.status === 'Done' || i.status === 'Resolved';
      return i.status === col.id;
    }),
  }));

  const handleMoveItem = useCallback(
    (itemId: string, _fromColId: string, toColId: string) => {
      updateIssue({ id: itemId, status: toColId });
    },
    [updateIssue],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issues & Action Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{issues.length} issues · Kéo thả để chuyển trạng thái (Kanban)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
          <ViewSwitcher view={view} onChange={(v) => setView('issues', v)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open', count: issues.filter((i) => i.status === 'Open').length, color: 'text-blue-600', Icon: AlertCircle },
          { label: 'In Progress', count: issues.filter((i) => i.status === 'In Progress' || i.status === 'Doing').length, color: 'text-purple-600', Icon: Clock },
          { label: 'Done', count: issues.filter((i) => ['Done', 'Resolved', 'Closed'].includes(i.status)).length, color: 'text-green-600', Icon: CheckCircle2 },
          { label: 'SLA Breached', count: issues.filter((i) => i.status === 'SLA Breached').length, color: 'text-red-600', Icon: Bug },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">Đang tải...</div>
      ) : isError ? (
        <div className="py-16 text-center text-red-500 text-sm">Lỗi tải dữ liệu. <button onClick={() => refetch()} className="underline">Thử lại</button></div>
      ) : view === 'grid' ? (
        <GridView data={issues} columns={GRID_COLUMNS} />
      ) : view === 'kanban' ? (
        <KanbanView columns={kanbanColumns} renderCard={(issue) => <IssueCard issue={issue} />} onMoveItem={handleMoveItem} />
      ) : (
        <GalleryView data={issues} renderCard={(issue) => <IssueGalleryCard issue={issue} />} getSearchText={(i) => `${i.issueCode} ${i.description} ${i.owner} ${i.issueType}`} />
      )}
    </div>
  );
}
