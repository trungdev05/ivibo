'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { usePlatformStore } from '@/store/platform-store';
import type { User, PlatformModule } from '@/lib/platform-types';
import { MODULE_REGISTRY } from '@/lib/module-registry';

function AppInitializer() {
  const setCurrentUser = usePlatformStore((s) => s.setCurrentUser);
  const setModules = usePlatformStore((s) => s.setModules);

  useEffect(() => {
    // Initialize modules from registry (all enabled by default until DB-driven toggle)
    const defaultModules: PlatformModule[] = MODULE_REGISTRY.map((m, i) => ({
      id: m.code,
      code: m.code,
      name: m.label,
      description: m.description,
      enabled: m.defaultEnabled,
      order: i,
    }));
    setModules(defaultModules);

    // Fetch current user
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user as User);
      })
      .catch(() => {});
  }, [setCurrentUser, setModules]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer />
      {children}
    </QueryClientProvider>
  );
}
