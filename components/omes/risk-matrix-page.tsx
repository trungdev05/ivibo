'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Risk } from '@/lib/omes-types';

export function RiskMatrixPage() {
  const query = useQuery({
    queryKey: ['omes-risks'],
    queryFn: async () => {
      const res = await fetch('/api/risks', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load risks');
      return payload.data as Risk[];
    },
  });

  const matrix = useMemo(() => {
    const grid: Record<string, number> = {};
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) grid[`${p}-${i}`] = 0;
    }
    for (const risk of query.data ?? []) {
      const key = `${risk.probability}-${risk.impact}`;
      grid[key] = (grid[key] ?? 0) + 1;
    }
    return grid;
  }, [query.data]);

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading risks...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Risk Matrix</h1>

      <div className="grid grid-cols-5 gap-2 mb-6 max-w-3xl">
        {[5, 4, 3, 2, 1].map((impact) =>
          [1, 2, 3, 4, 5].map((prob) => {
            const count = matrix[`${prob}-${impact}`] ?? 0;
            const score = prob * impact;
            const color = score >= 16 ? 'bg-red-200' : score >= 10 ? 'bg-orange-200' : score >= 6 ? 'bg-yellow-200' : 'bg-green-200';
            return (
              <div key={`${prob}-${impact}`} className={`h-14 rounded border border-gray-300 flex items-center justify-center text-xs font-semibold ${color}`}>
                {count}
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-8 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 p-3">
          <span>Risk title</span><span>Probability</span><span>Impact</span><span>Risk score</span><span>Risk level</span><span>Owner</span><span>Mitigation</span><span>Status</span>
        </div>
        {(query.data ?? []).map((risk) => (
          <div key={risk.id} className="grid grid-cols-8 text-sm p-3 border-b border-gray-100 last:border-none">
            <span className="truncate">{risk.description}</span>
            <span>{risk.probability}</span>
            <span>{risk.impact}</span>
            <span>{risk.riskScore}</span>
            <span>{risk.riskLevel}</span>
            <span>{risk.owner}</span>
            <span className="truncate">{risk.mitigationPlan}</span>
            <span>{risk.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
