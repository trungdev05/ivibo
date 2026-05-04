'use client';

import { useQuery } from '@tanstack/react-query';
import { StatusPill } from './ui';

type TimelinePhase = {
  projectId: string;
  projectName: string;
  phase: string;
  startDate: string;
  endDate: string;
  owner: string;
  status: string;
  dependencies: string;
  delay: boolean;
};

export function TimelinePage() {
  const query = useQuery({
    queryKey: ['omes-timeline'],
    queryFn: async () => {
      const res = await fetch('/api/timeline', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load timeline');
      return payload.data as TimelinePhase[];
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading timeline...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Timeline / Gantt</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-8 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 p-3">
          <span>Project</span>
          <span>Phase</span>
          <span>Start</span>
          <span>End</span>
          <span>Owner</span>
          <span>Status</span>
          <span>Dependencies</span>
          <span>Delay</span>
        </div>
        {query.data?.map((phase, idx) => (
          <div key={`${phase.projectId}-${phase.phase}-${idx}`} className="grid grid-cols-8 text-sm p-3 border-b border-gray-100 last:border-none">
            <span className="text-gray-700 truncate">{phase.projectName}</span>
            <span className="font-medium text-gray-900">{phase.phase}</span>
            <span>{phase.startDate}</span>
            <span>{phase.endDate}</span>
            <span>{phase.owner}</span>
            <span><StatusPill value={phase.status} /></span>
            <span>{phase.dependencies}</span>
            <span className={phase.delay ? 'text-red-600' : 'text-emerald-600'}>{phase.delay ? 'Delayed' : 'On track'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
