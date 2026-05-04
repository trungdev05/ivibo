'use client';

import { useQuery } from '@tanstack/react-query';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DashboardReport = {
  openIssues: number;
  openCriticalIssues: number;
  monthlyTrend: Array<{ month: string; ev: number; pv: number }>;
  averageProjectProgress: number;
  highRiskProjects: number;
  slaBreached: number;
  resourceOverload: number;
};

type MonthlySummary = {
  id: string;
  month: string;
};

export function ReportsPage() {
  const dashboard = useQuery({
    queryKey: ['omes-dashboard-report'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load reports');
      return payload.data as DashboardReport;
    },
  });

  const monthly = useQuery({
    queryKey: ['omes-monthly-report'],
    queryFn: async () => {
      const res = await fetch('/api/monthly-reports', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load monthly report');
      return payload.data as MonthlySummary[];
    },
  });

  if (dashboard.isPending || monthly.isPending) return <div className="p-6 text-sm text-gray-500">Loading reports...</div>;
  if (dashboard.error) return <div className="p-6 text-sm text-red-600">{dashboard.error.message}</div>;
  if (monthly.error) return <div className="p-6 text-sm text-red-600">{monthly.error.message}</div>;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Reports Center</h1>

      <ReportSection title="Weekly Report">
        <p className="text-sm text-gray-600">Current open issues: {dashboard.data.openIssues}. Critical open: {dashboard.data.openCriticalIssues}.</p>
      </ReportSection>

      <ReportSection title="Monthly Report">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.data.monthlyTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="ev" stroke="#16a34a" strokeWidth={2} />
              <Line dataKey="pv" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>

      <ReportSection title="Project Health Report">
        <p className="text-sm text-gray-700">Average project progress: {dashboard.data.averageProjectProgress}%</p>
        <p className="text-sm text-gray-700">Project health distribution is available in dashboard widget.</p>
      </ReportSection>

      <ReportSection title="Risk Report">
        <p className="text-sm text-gray-700">High-risk projects: {dashboard.data.highRiskProjects}</p>
      </ReportSection>

      <ReportSection title="SLA Report">
        <p className="text-sm text-gray-700">Breached SLA count: {dashboard.data.slaBreached}</p>
      </ReportSection>

      <ReportSection title="Resource Report">
        <p className="text-sm text-gray-700">Resource overload count: {dashboard.data.resourceOverload}</p>
      </ReportSection>

      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
        Export-ready layout complete. Wire PDF/Excel exporter at this section.
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">{title}</h2>
      {children}
    </section>
  );
}
