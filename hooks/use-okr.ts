/**
 * hooks/use-okr.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useOkr() {
  return useQuery({
    queryKey: ['okr'],
    queryFn: async () => {
      const r = await fetch('/api/okr');
      if (!r.ok) throw new Error('Failed to fetch OKR');
      return r.json();
    },
  });
}

export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch('/api/okr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to create objective');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr'] }),
  });
}
