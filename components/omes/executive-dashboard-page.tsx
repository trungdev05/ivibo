'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MetricCard } from './ui';

type ExecutiveDashboard = {
  totalProjects: number;
  delayedProjects: number;
  highRiskProjects: number;
  slaBreached: number;
  openCriticalIssues: number;
  averageProjectProgress: number;
  resourceOverload: number;
  avgCpi: number;
  avgSpi: number;
  moduleCompletionRate: number;
  healthDistribution: Array<{ name: string; value: number }>;
  moduleProgress: Array<{ moduleName: string; actualProgress: number }>;
};

export function ExecutiveDashboardPage() {
  const query = useQuery({
    queryKey: ['omes-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load dashboard');
      return payload.data as ExecutiveDashboard;
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading executive dashboard...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  const d = query.data;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Executive Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MetricCard label="Total projects" value={d.totalProjects} />
        <MetricCard label="Delayed projects" value={d.delayedProjects} tone="danger" />
        <MetricCard label="High-risk projects" value={d.highRiskProjects} tone="warn" />
        <MetricCard label="SLA breached" value={d.slaBreached} tone="danger" />
        <MetricCard label="Open critical issues" value={d.openCriticalIssues} tone="danger" />
        <MetricCard label="Avg project progress" value={`${d.averageProjectProgress}%`} />
        <MetricCard label="Resource overload" value={d.resourceOverload} tone="warn" />
        <MetricCard label="CPI" value={d.avgCpi} />
        <MetricCard label="SPI" value={d.avgSpi} />
        <MetricCard label="Module completion" value={`${d.moduleCompletionRate}%`} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Project Health Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.healthDistribution} dataKey="value" nameKey="name" outerRadius={90} fill="#0ea5e9" label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Module Completion Rate</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.moduleProgress}>
                <XAxis dataKey="moduleName" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actualProgress" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
