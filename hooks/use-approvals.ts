/**
 * hooks/use-approvals.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const r = await fetch('/api/approvals');
      if (!r.ok) throw new Error('Failed to fetch approvals');
      return r.json();
    },
  });
}

export function useApproveReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const r = await fetch('/api/approvals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      if (!r.ok) throw new Error('Failed to update approval');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}
