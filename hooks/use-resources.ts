/**
 * hooks/use-resources.ts
 */
import { useQuery } from '@tanstack/react-query';

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const r = await fetch('/api/resources');
      if (!r.ok) throw new Error('Failed to fetch resources');
      return r.json();
    },
  });
}
