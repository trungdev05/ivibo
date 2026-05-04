'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MetricCard } from './ui';

type SlaDashboardData = {
  totalRequests: number;
  openRequests: number;
  breachedSla: number;
  averageResponseTime: number;
  criticalOpenIssues: number;
  requestsBySeverity: Array<{ severity: string; value: number }>;
  requestsByOwner: Array<{ owner: string; value: number }>;
  defaultSla: Record<string, string>;
};

export function SlaDashboardPage() {
  const query = useQuery({
    queryKey: ['omes-sla-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/sla/dashboard', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load SLA dashboard');
      return payload.data as SlaDashboardData;
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading SLA dashboard...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  const data = query.data;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">SLA Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <MetricCard label="Total requests" value={data.totalRequests} />
        <MetricCard label="Open requests" value={data.openRequests} tone="warn" />
        <MetricCard label="Breached SLA" value={data.breachedSla} tone="danger" />
        <MetricCard label="Avg response time" value={`${data.averageResponseTime}h`} />
        <MetricCard label="Critical open issues" value={data.criticalOpenIssues} tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Requests by Severity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.requestsBySeverity}>
                <XAxis dataKey="severity" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Requests by Owner</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.requestsByOwner} dataKey="value" nameKey="owner" outerRadius={90} fill="#0ea5e9" label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold mb-3">Default SLA Policy</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {Object.entries(data.defaultSla).map(([level, target]) => (
            <div key={level} className="rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500">{level}</p>
              <p className="font-semibold text-gray-900">{String(target)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
