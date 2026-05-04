import { UserRole } from './omes-types';
import type { GlobalRole, ModuleCode, UserModulePermission } from './platform-types';

// ── Legacy project-management RBAC (kept for existing API routes) ─────────────

type Action = 'read' | 'write' | 'manage_templates' | 'manage_all';

const rolePermissions: Record<UserRole, Action[]> = {
  admin: ['read', 'write', 'manage_templates', 'manage_all'],
  pmo: ['read', 'manage_templates'],
  project_manager: ['read', 'write'],
  tech_lead: ['read', 'write'],
  developer: ['read', 'write'],
  qa: ['read', 'write'],
  viewer: ['read'],
  customer_viewer: ['read'],
};

export function getRoleFromRequest(req: Request): UserRole {
  const role = (req.headers.get('x-user-role') ?? 'admin').toLowerCase();
  const allRoles = Object.keys(rolePermissions) as UserRole[];
  return allRoles.includes(role as UserRole) ? (role as UserRole) : 'viewer';
}

export function can(role: UserRole, action: Action): boolean {
  return rolePermissions[role].includes(action);
}

// ── Module-aware RBAC ─────────────────────────────────────────────────────────

type ModuleAction = keyof Omit<UserModulePermission, 'id' | 'userId' | 'moduleCode'>;

/**
 * Default permissions per GlobalRole.
 * In production, override with per-user rows from the DB.
 */
const globalRoleModuleDefaults: Record<GlobalRole, Record<ModuleAction, boolean>> = {
  super_admin: {
    canView: true, canCreate: true, canUpdate: true, canDelete: true,
    canApprove: true, canExport: true, canConfig: true,
  },
  admin: {
    canView: true, canCreate: true, canUpdate: true, canDelete: true,
    canApprove: true, canExport: true, canConfig: false,
  },
  manager: {
    canView: true, canCreate: true, canUpdate: true, canDelete: false,
    canApprove: true, canExport: true, canConfig: false,
  },
  employee: {
    canView: true, canCreate: true, canUpdate: true, canDelete: false,
    canApprove: false, canExport: false, canConfig: false,
  },
  viewer: {
    canView: true, canCreate: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canConfig: false,
  },
};

/**
 * Per-user, per-module overrides.
 * Replace with a DB query (UserModulePermission table) in production.
 * Format: { [userId]: { [ModuleCode]: { [action]: boolean } } }
 */
const userModuleOverrides: Partial<
  Record<string, Partial<Record<ModuleCode, Partial<Record<ModuleAction, boolean>>>>>
> = {
  // Example: give a specific employee export rights on OKR
  // 'u3': { OKR: { canExport: true } },
};

export function getModulePermissions(
  userId: string,
  globalRole: GlobalRole,
  moduleCode: ModuleCode,
): Record<ModuleAction, boolean> {
  const defaults = globalRoleModuleDefaults[globalRole];
  const overrides = userModuleOverrides[userId]?.[moduleCode] ?? {};
  return { ...defaults, ...overrides };
}

export function canModule(
  userId: string,
  globalRole: GlobalRole,
  moduleCode: ModuleCode,
  action: ModuleAction,
): boolean {
  return getModulePermissions(userId, globalRole, moduleCode)[action];
}

/** Get all module permissions for a user — used in /api/auth/me response */
export function getAllModulePermissions(
  userId: string,
  globalRole: GlobalRole,
): Record<ModuleCode, Record<ModuleAction, boolean>> {
  const codes: ModuleCode[] = ['PROJECT_MANAGEMENT', 'PURCHASING', 'APPROVAL', 'ATTENDANCE', 'OKR'];
  const result = {} as Record<ModuleCode, Record<ModuleAction, boolean>>;
  for (const code of codes) {
    result[code] = getModulePermissions(userId, globalRole, code);
  }
  return result;
}
