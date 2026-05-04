'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import { getSidebarGroups } from '@/lib/module-registry';
import type { ModuleCode } from '@/lib/platform-types';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  CheckCircle2,
  Ticket,
  Users,
  Target,
  ShoppingCart,
  CheckSquare,
  CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  CheckCircle2,
  Ticket,
  Users,
  Target,
  ShoppingCart,
  CheckSquare,
  CalendarDays,
};

const DASHBOARD_GROUP = {
  title: 'TONG QUAN',
  items: [{ href: '/', label: 'Tổng quan', icon: 'LayoutDashboard', exact: true } as const],
};

const SYSTEM_GROUP = {
  title: 'HE THONG',
  items: [{ href: '/users', label: 'Người dùng', icon: 'Users' } as { href: string; label: string; icon: string; exact?: boolean }],
};

export function Sidebar() {
  const pathname = usePathname();
  const modules = usePlatformStore((s) => s.modules);

  const hasTicketsQuery = useQuery<{ data: { hasAccess?: boolean; hasTickets: boolean } }>({
    queryKey: ['my-has-tickets-sidebar'],
    queryFn: () => fetch('/api/work/my/has-tickets').then((r) => r.json()),
    staleTime: 30_000,
  });
  const canSeeTicketNav = hasTicketsQuery.data?.data.hasAccess ?? true;

  // Derive enabled codes; if store not yet loaded, show all (defaultEnabled)
  const enabledCodes: ModuleCode[] | undefined =
    modules.length > 0 ? modules.filter((m) => m.enabled).map((m) => m.code) : undefined;

  const moduleGroups = getSidebarGroups(enabledCodes);

  const filteredGroups = moduleGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.href !== '/tickets') return true;
      return canSeeTicketNav;
    }),
  }));

  const allGroups = [DASHBOARD_GROUP, ...filteredGroups, SYSTEM_GROUP];

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-gray-900 text-gray-100 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-600/90 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          iv
        </div>
        <div>
          <p className="font-semibold text-sm leading-4">i-vibo</p>
          <p className="text-[10px] text-gray-400 tracking-wider">WORK MANAGEMENT</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {allGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2 mb-1 text-[10px] uppercase tracking-wider text-gray-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                const active =
                  item.exact || item.href === '/'
                    ? pathname === item.href
                    : pathname.startsWith(item.href.split('?')[0]);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-blue-600 text-white shadow-[inset_0_0_16px_rgba(255,255,255,0.2)]'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
