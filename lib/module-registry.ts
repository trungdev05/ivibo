/**
 * lib/module-registry.ts
 * Central source of truth for all platform modules.
 * Add new modules here — sidebar, RBAC, and middleware all derive from this.
 */
import type { ModuleCode } from './platform-types';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // matches key in ICON_MAP inside sidebar
  exact?: boolean; // active only on exact path match
}

export interface ModuleDefinition {
  code: ModuleCode;
  label: string;
  description: string;
  /** Sidebar group heading */
  group: string;
  /** Nav items rendered in sidebar under this module */
  navItems: NavItem[];
  /** Page paths that belong to this module (for middleware guard) */
  basePaths: string[];
  /** API paths that belong to this module (for middleware guard) */
  apiPaths: string[];
  /** Whether the module is enabled by default (before DB-driven toggle) */
  defaultEnabled: boolean;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ─── Project Management ─────────────────────────────────────────────────────
  {
    code: 'PROJECT_MANAGEMENT',
    label: 'Quản lý dự án',
    description: 'Dự án, công việc, SLA, rủi ro, vấn đề',
    group: 'CONG VIEC',
    navItems: [
      { label: 'Dự án', href: '/projects', icon: 'FolderKanban' },
      { label: 'Công việc của tôi', href: '/work', icon: 'ClipboardCheck', exact: true },
      { label: 'Ticket của tôi', href: '/tickets', icon: 'Ticket' },
      { label: 'Ticket SLA', href: '/sla', icon: 'Ticket' },
    ],
    basePaths: ['/projects', '/work', '/tickets', '/sla', '/issues', '/risks'],
    apiPaths: ['/api/projects', '/api/sla', '/api/issues', '/api/risks', '/api/resources', '/api/modules', '/api/daily-updates', '/api/monthly-reports', '/api/timeline', '/api/dashboard'],
    defaultEnabled: true,
  },

  // ─── OKR ────────────────────────────────────────────────────────────────────
  {
    code: 'OKR',
    label: 'OKR',
    description: 'Mục tiêu và kết quả then chốt',
    group: 'HIEU SUAT',
    navItems: [
      { label: 'OKR', href: '/okr', icon: 'Target' },
    ],
    basePaths: ['/okr'],
    apiPaths: ['/api/okr'],
    defaultEnabled: true,
  },

  // ─── Purchasing ──────────────────────────────────────────────────────────────
  {
    code: 'PURCHASING',
    label: 'Mua hàng',
    description: 'Đơn mua hàng và nhà cung cấp',
    group: 'HANH CHINH',
    navItems: [
      { label: 'Mua hàng', href: '/purchasing', icon: 'ShoppingCart' },
    ],
    basePaths: ['/purchasing'],
    apiPaths: ['/api/purchasing'],
    defaultEnabled: true,
  },

  // ─── Approvals ───────────────────────────────────────────────────────────────
  {
    code: 'APPROVAL',
    label: 'Phê duyệt',
    description: 'Luồng phê duyệt và ký duyệt',
    group: 'HANH CHINH',
    navItems: [
      { label: 'Phê duyệt', href: '/approvals', icon: 'CheckSquare' },
    ],
    basePaths: ['/approvals'],
    apiPaths: ['/api/approvals'],
    defaultEnabled: true,
  },

  // ─── Attendance / Schedule ───────────────────────────────────────────────────
  {
    code: 'ATTENDANCE',
    label: 'Lịch trình',
    description: 'Lịch làm việc và chấm công',
    group: 'HANH CHINH',
    navItems: [
      { label: 'Lịch trình', href: '/schedule', icon: 'CalendarDays' },
    ],
    basePaths: ['/schedule'],
    apiPaths: ['/api/schedule'],
    defaultEnabled: true,
  },
];

/** Look up a module by any of its page paths */
export function getModuleByPagePath(pathname: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) =>
    m.basePaths.some((p) => pathname === p || pathname.startsWith(p + '/')),
  );
}

/** Look up a module by any of its API paths */
export function getModuleByApiPath(pathname: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) =>
    m.apiPaths.some((p) => pathname === p || pathname.startsWith(p + '/')),
  );
}

/** All sidebar groups, deduplicated and ordered */
export function getSidebarGroups(enabledCodes?: ModuleCode[]): Array<{
  title: string;
  items: NavItem[];
}> {
  const modules = enabledCodes
    ? MODULE_REGISTRY.filter((m) => enabledCodes.includes(m.code))
    : MODULE_REGISTRY;

  const groupMap = new Map<string, NavItem[]>();

  for (const mod of modules) {
    if (!groupMap.has(mod.group)) groupMap.set(mod.group, []);
    groupMap.get(mod.group)!.push(...mod.navItems);
  }

  return Array.from(groupMap.entries()).map(([title, items]) => ({ title, items }));
}
