/**
 * hooks/use-sla.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useSlaRequests(projectId?: string) {
  const url = projectId ? `/api/sla?projectId=${projectId}` : '/api/sla';
  return useQuery({
    queryKey: ['sla', projectId ?? 'all'],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Failed to fetch SLA requests');
      return r.json();
    },
  });
}

export function useCreateSlaRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch('/api/sla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to create SLA request');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla'] }),
  });
}

export function useUpdateSlaRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const r = await fetch(`/api/sla/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to update SLA request');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla'] }),
  });
}
