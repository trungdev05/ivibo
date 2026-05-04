/**
 * store/platform-store.ts
 * Platform-wide Zustand store.
 * Tracks enabled modules, current user, and active project context.
 */
import { create } from 'zustand';
import type { PlatformModule, ModuleCode, User } from '@/lib/platform-types';

interface PlatformStore {
  // Current user (stub — replace with real auth session)
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Enabled modules
  modules: PlatformModule[];
  setModules: (modules: PlatformModule[]) => void;
  isModuleEnabled: (code: ModuleCode) => boolean;

  // Active project context (used by project detail pages)
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Global loading / error state
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export const usePlatformStore = create<PlatformStore>((set, get) => ({
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),

  modules: [],
  setModules: (modules) => set({ modules }),
  isModuleEnabled: (code) => get().modules.some((m) => m.code === code && m.enabled),

  activeProjectId: null,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
