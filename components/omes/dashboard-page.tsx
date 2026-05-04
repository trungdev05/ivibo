'use client';

import { useQuery } from '@tanstack/react-query';

type Dashboard = {
  totalProjects: number;
  delayedProjects: number;
  openIssues: number;
  slaBreached: number;
  highRiskProjects: number;
  resourceGap: number;
  avgCpi: number;
  avgSpi: number;
  projectHealth: Array<{ projectName: string; overallHealth: string }>;
  moduleProgress: Array<{ moduleName: string; actualProgress: number }>;
  monthlyTrend: Array<{ month: string; ev: number; pv: number }>;
};

export function OmesDashboardPage() {
  const query = useQuery({
    queryKey: ['omes-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load dashboard');
      return payload.data as Dashboard;
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Loading dashboard...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{(query.error as Error).message}</div>;

  const data = query.data;

  const cards = [
    { label: 'Total projects', value: data.totalProjects },
    { label: 'Delayed projects', value: data.delayedProjects },
    { label: 'Open issues', value: data.openIssues },
    { label: 'SLA breached', value: data.slaBreached },
    { label: 'High-risk projects', value: data.highRiskProjects },
    { label: 'Resource gap', value: data.resourceGap },
    { label: 'Avg CPI', value: data.avgCpi },
    { label: 'Avg SPI', value: data.avgSpi },
  ];

  return (
    <div className="p-6 overflow-auto h-full bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">OMES Portfolio Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Project Health</h2>
          <div className="space-y-2">
            {data.projectHealth.map((h) => (
              <div key={h.projectName} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{h.projectName}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${colorCls(h.overallHealth)}`}>
                  {h.overallHealth}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Module Progress</h2>
          <div className="space-y-3">
            {data.moduleProgress.map((m) => (
              <div key={m.moduleName}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{m.moduleName}</span>
                  <span>{m.actualProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.min(100, m.actualProgress)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Monthly EV / PV Trend</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.monthlyTrend.map((t, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-500">{t.month}</p>
                <p className="text-sm">EV: <strong>{t.ev}</strong></p>
                <p className="text-sm">PV: <strong>{t.pv}</strong></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function colorCls(health: string) {
  if (health === 'green') return 'bg-green-100 text-green-700';
  if (health === 'yellow') return 'bg-yellow-100 text-yellow-700';
  if (health === 'orange') return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}
