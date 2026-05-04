/**
 * hooks/use-issues.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useIssues(projectId?: string) {
  const url = projectId ? `/api/issues?projectId=${projectId}` : '/api/issues';
  return useQuery({
    queryKey: ['issues', projectId ?? 'all'],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Failed to fetch issues');
      return r.json();
    },
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch('/api/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to create issue');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });
}

export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const r = await fetch(`/api/issues/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Failed to update issue');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });
}

export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/issues/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete issue');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });
}
