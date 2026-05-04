'use client';

import { useQuery } from '@tanstack/react-query';
import { Resource } from '@/lib/omes-types';

export function ResourceAllocationPage() {
  const query = useQuery({
    queryKey: ['omes-resources'],
    queryFn: async () => {
      const res = await fetch('/api/resources', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load resources');
      return payload.data as Resource[];
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading resources...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Resource Management</h1>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-9 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 p-3">
          <span>Team member</span><span>Role</span><span>Assigned project</span><span>Allocation %</span><span>Availability</span><span>Skill</span><span>Responsibility</span><span>Backup person</span><span>Overload warning</span>
        </div>
        {(query.data ?? []).map((res) => {
          const allocation = res.fullOrPartTime === 'Full-time' ? 100 : 60;
          const overload = allocation > res.availability;
          return (
            <div key={res.id} className="grid grid-cols-9 text-sm p-3 border-b border-gray-100 last:border-none">
              <span>{res.person}</span>
              <span>{res.role}</span>
              <span className="truncate">{res.projectId.slice(0, 8)}</span>
              <span>{allocation}%</span>
              <span>{res.availability}%</span>
              <span>{res.skill}</span>
              <span>{res.responsibility}</span>
              <span>{res.backupPerson}</span>
              <span className={overload ? 'text-red-600 font-medium' : 'text-emerald-600'}>{overload ? 'Overloaded' : 'Healthy'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
