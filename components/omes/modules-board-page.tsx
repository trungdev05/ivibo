'use client';

import { useQuery } from '@tanstack/react-query';
import { StatusPill } from './ui';
import { OmesModule } from '@/lib/omes-types';

export function ModulesBoardPage() {
  const query = useQuery({
    queryKey: ['omes-modules'],
    queryFn: async () => {
      const res = await fetch('/api/modules', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load modules');
      return payload.data as OmesModule[];
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading modules...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">OMES Module Board</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(query.data ?? []).map((module) => (
          <div key={module.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">{module.moduleName}</h2>
              <StatusPill value={module.status} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-600">
              <p>Owner: <span className="font-medium text-gray-800">{module.owner}</span></p>
              <p>Progress: <span className="font-medium text-gray-800">{module.actualProgress}%</span></p>
              <p>UAT: <span className="font-medium text-gray-800">{module.uatStatus}</span></p>
              <p>Bug count: <span className="font-medium text-gray-800">{module.bugCount}</span></p>
              <p>Release: <span className="font-medium text-gray-800">{module.releaseStatus}</span></p>
              <p>Due: <span className="font-medium text-gray-800">{module.dueDate}</span></p>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full">
              <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, module.actualProgress)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
