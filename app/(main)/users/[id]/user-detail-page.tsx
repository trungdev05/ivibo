'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Shield,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  Check,
  Pencil,
  X,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { OmesUser, UserModuleOverride } from '@/lib/omes-mock';
import type { GlobalRole, ModuleCode } from '@/lib/platform-types';
import { MODULE_REGISTRY } from '@/lib/module-registry';
import { SearchableSelect } from '@/components/omes/ui';

// ── Types ──────────────────────────────────────────────────────────────────────
type UserDetail = OmesUser & {
  moduleOverrides: UserModuleOverride[];
  projects: Array<{
    id: string;
    projectName: string;
    projectCode: string;
    status: string;
    overallHealth: string;
    resourceRole: string;
    resourceStatus: string;
  }>;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const GLOBAL_ROLES: { value: GlobalRole; label: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Admin',  color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'admin',       label: 'Admin',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'manager',     label: 'Manager',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'employee',    label: 'Employee',      color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'viewer',      label: 'Viewer',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

const DEPARTMENTS = ['PMO', 'Engineering', 'QA', 'Design', 'Sales', 'IT', 'HR', 'Finance'];

const MODULE_ACTIONS: (keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>)[] = [
  'canView', 'canCreate', 'canUpdate', 'canDelete', 'canApprove', 'canExport', 'canConfig',
];
const ACTION_LABELS: Record<string, string> = {
  canView: 'Xem', canCreate: 'Tạo', canUpdate: 'Sửa',
  canDelete: 'Xóa', canApprove: 'Duyệt', canExport: 'Xuất', canConfig: 'Cấu hình',
};

const MODULE_ROLE_DEFAULTS: Record<GlobalRole, Record<keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>, boolean>> = {
  super_admin: { canView: true,  canCreate: true,  canUpdate: true,  canDelete: true,  canApprove: true,  canExport: true,  canConfig: true  },
  admin:       { canView: true,  canCreate: true,  canUpdate: true,  canDelete: true,  canApprove: true,  canExport: true,  canConfig: false },
  manager:     { canView: true,  canCreate: true,  canUpdate: true,  canDelete: false, canApprove: true,  canExport: true,  canConfig: false },
  employee:    { canView: true,  canCreate: true,  canUpdate: true,  canDelete: false, canApprove: false, canExport: false, canConfig: false },
  viewer:      { canView: true,  canCreate: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, canConfig: false },
};

const HEALTH_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = name.split(' ').slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = { sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-base', lg: 'h-16 w-16 text-2xl', xl: 'h-20 w-20 text-3xl' }[size];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: GlobalRole }) {
  const def = GLOBAL_ROLES.find((r) => r.value === role);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${def?.color ?? ''}`}>
      <Shield className="h-3 w-3" />
      {def?.label ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
    invited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  const labels: Record<string, string> = { active: 'Hoạt động', inactive: 'Tạm ngừng', invited: 'Mời' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────────
function EditProfileModal({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: OmesUser;
  onClose: () => void;
  onSave: (d: Partial<OmesUser>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    globalRole: user.globalRole as GlobalRole,
    department: user.department,
    phone: user.phone ?? '',
    status: user.status as OmesUser['status'],
  });
  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Chỉnh sửa hồ sơ</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Họ tên *</label>
              <input value={form.name} onChange={(e) => f('name', e.target.value)} className="input-base w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
              <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} className="input-base w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Chức danh</label>
              <input value={form.role} onChange={(e) => f('role', e.target.value)} className="input-base w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phòng ban</label>
              <SearchableSelect
                value={form.department}
                onChange={(v) => f('department', v)}
                options={[{ value: '', label: '-- Chọn --' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
                placeholder="-- Chọn --"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vai trò hệ thống</label>
              <SearchableSelect
                value={form.globalRole}
                onChange={(v) => f('globalRole', v)}
                options={GLOBAL_ROLES.map((r) => ({ value: r.value, label: r.label }))}
                placeholder="Chọn vai trò"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Trạng thái</label>
              <SearchableSelect
                value={form.status}
                onChange={(v) => f('status', v)}
                options={[
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Tạm ngừng' },
                  { value: 'invited', label: 'Mời' },
                ]}
                placeholder="Chọn trạng thái"
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Điện thoại</label>
              <input value={form.phone} onChange={(e) => f('phone', e.target.value)} className="input-base w-full" placeholder="+84..." />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.email}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="h-4 w-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permission Matrix ──────────────────────────────────────────────────────────
function PermissionMatrix({
  user,
  overrides,
  onToggle,
  pending,
}: {
  user: OmesUser;
  overrides: UserModuleOverride[];
  onToggle: (moduleCode: ModuleCode, action: keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>) => void;
  pending: boolean;
}) {
  const defaults = MODULE_ROLE_DEFAULTS[user.globalRole];

  const getEffective = (moduleCode: ModuleCode) => {
    const ov = overrides.find((o) => o.moduleCode === moduleCode);
    return ov ?? { ...defaults, userId: user.id, moduleCode };
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Phân quyền theo module</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Mặc định từ vai trò <strong>{GLOBAL_ROLES.find((r) => r.value === user.globalRole)?.label}</strong>.
            Hàng tô màu xanh = đang có override.
          </p>
        </div>
        {pending && <span className="text-xs text-gray-400 animate-pulse">Đang lưu...</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 min-w-[140px]">Module</th>
              {MODULE_ACTIONS.map((a) => (
                <th key={a} className="px-2 py-2.5 text-center font-medium text-gray-500 text-xs whitespace-nowrap">
                  {ACTION_LABELS[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_REGISTRY.map((mod) => {
              const eff = getEffective(mod.code);
              const hasOverride = overrides.some((o) => o.moduleCode === mod.code);
              return (
                <tr key={mod.code} className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors ${hasOverride ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{mod.label}</span>
                      {hasOverride && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">custom</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{mod.description}</p>
                  </td>
                  {MODULE_ACTIONS.map((action) => {
                    const val = eff[action as keyof typeof eff] as boolean;
                    return (
                      <td key={action} className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => onToggle(mod.code, action)}
                          className={`h-5 w-5 rounded border-2 mx-auto flex items-center justify-center transition-all ${
                            val
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 hover:border-blue-400 bg-white'
                          }`}
                        >
                          {val && <Check className="h-3 w-3" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserDetailPage({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error } = useQuery<UserDetail>({
    queryKey: ['user-detail', userId],
    queryFn: async () => {
      const r = await fetch(`/api/users/${userId}`);
      if (!r.ok) throw new Error('Không tìm thấy người dùng');
      const j = await r.json();
      return j.data as UserDetail;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<OmesUser>) => {
      const r = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Lỗi lưu');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-detail', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
    },
  });

  const permMutation = useMutation({
    mutationFn: async (override: UserModuleOverride) => {
      await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-detail', userId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 animate-pulse">
        Đang tải...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm text-red-600">{error?.message ?? 'Người dùng không tồn tại'}</p>
        <Link href="/users" className="text-sm text-blue-600 hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  const user = data;
  const overrides = data.moduleOverrides ?? [];
  const projects = data.projects ?? [];

  const handleToggle = (
    moduleCode: ModuleCode,
    action: keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>,
  ) => {
    const defaults = MODULE_ROLE_DEFAULTS[user.globalRole];
    const current = overrides.find((o) => o.moduleCode === moduleCode) ?? {
      ...defaults,
      userId: user.id,
      moduleCode,
    };
    permMutation.mutate({ ...current, [action]: !current[action] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quản lý người dùng
      </Link>

      {/* Profile header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={user.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold truncate">{user.name}</h1>
              <RoleBadge role={user.globalRole} />
              <StatusBadge status={user.status} />
            </div>
            <p className="text-gray-500 text-sm">{user.role || '—'}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
              {user.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone}</span>}
              {user.department && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{user.department}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Tạo: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
              {user.lastLogin && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Đăng nhập cuối: {new Date(user.lastLogin).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Dự án đang tham gia</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{projects.filter((p) => p.resourceStatus === 'Active').length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tổng dự án</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Override quyền</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{overrides.length}</p>
          <p className="text-xs text-gray-500">module</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Phòng ban</p>
          <p className="text-lg font-semibold mt-1 truncate text-gray-900">{user.department || '—'}</p>
        </div>
      </div>

      {/* Projects section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Dự án đang tham gia ({projects.length})</h2>
        </div>
        {projects.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Chưa tham gia dự án nào
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${HEALTH_COLORS[p.overallHealth]?.includes('green') ? 'bg-green-500' : HEALTH_COLORS[p.overallHealth]?.includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-gray-900">{p.projectName}</p>
                    <p className="text-xs text-gray-500">{p.projectCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">{p.resourceRole || '—'}</p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.resourceStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.resourceStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${HEALTH_COLORS[p.overallHealth] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.overallHealth}
                    </span>
                    <span className="text-xs text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{p.status}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Permission matrix */}
      <PermissionMatrix
        user={user}
        overrides={overrides}
        onToggle={handleToggle}
        pending={permMutation.isPending}
      />

      {/* Edit modal */}
      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSave={(d) => saveMutation.mutate(d)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
