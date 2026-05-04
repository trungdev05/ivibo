/**
 * hooks/use-risks.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useRisks(projectId?: string) {
  const url = projectId ? `/api/risks?projectId=${projectId}` : '/api/risks';
  return useQuery({
    queryKey: ['risks', projectId ?? 'all'],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Failed to fetch risks');
      return r.json();
    },
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch('/api/risks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to create risk');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}
