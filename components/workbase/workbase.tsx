'use client';

import { useQuery } from '@tanstack/react-query';
import { WorkBaseShell } from './workbase-shell';

type WorkBaseProps = {
  projectId: string;
  compact?: boolean;
  /** If set, the WorkBase will open this task's detail panel automatically after loading. */
  openTaskId?: string;
};

export function WorkBase({ projectId, compact = false, openTaskId }: WorkBaseProps) {
  const query = useQuery({
    queryKey: ['workbase', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/omes/workbase?projectId=${projectId}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load WorkBase');
      return payload.data as {
        baseId: string;
        projectId: string;
        tables: Record<string, { id: string; name: string }>;
      };
    },
  });

  if (query.isPending) return <div className="p-4 text-sm text-gray-500">Đang chuẩn bị bảng công việc...</div>;
  if (query.error) return <div className="p-4 text-sm text-red-500">{query.error.message}</div>;

  const tasksTable = query.data?.tables?.tasks;
  if (!tasksTable?.id) return <div className="p-4 text-sm text-gray-500">Không tìm thấy bảng công việc.</div>;

  return (
    <div className={compact ? 'flex flex-col h-full overflow-hidden' : 'flex flex-col h-full overflow-hidden'}>
      <WorkBaseShell baseId={query.data.baseId} tableId={tasksTable.id} hideBreadcrumb={compact} openTaskId={openTaskId} />
    </div>
  );
}
