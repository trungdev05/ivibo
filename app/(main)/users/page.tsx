'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Shield,
  Mail,
  Send,
  X,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { OmesUser, UserModuleOverride } from '@/lib/omes-mock';
import type { GlobalRole, ModuleCode } from '@/lib/platform-types';
import { MODULE_REGISTRY } from '@/lib/module-registry';
import { SearchableSelect } from '@/components/omes/ui';

// ── Constants ─────────────────────────────────────────────────────────────────

const GLOBAL_ROLES: { value: GlobalRole; label: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Admin',  color: 'bg-red-100 text-red-700' },
  { value: 'admin',       label: 'Admin',         color: 'bg-orange-100 text-orange-700' },
  { value: 'manager',     label: 'Manager',       color: 'bg-blue-100 text-blue-700' },
  { value: 'employee',    label: 'Employee',      color: 'bg-green-100 text-green-700' },
  { value: 'viewer',      label: 'Viewer',        color: 'bg-gray-100 text-gray-600' },
];

const DEPARTMENTS = ['PMO', 'Engineering', 'QA', 'Design', 'Sales', 'IT', 'HR', 'Finance'];

const MODULE_ACTIONS: (keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>)[] = [
  'canView', 'canCreate', 'canUpdate', 'canDelete', 'canApprove', 'canExport', 'canConfig',
];
const ACTION_LABELS: Record<string, string> = {
  canView: 'Xem', canCreate: 'Tạo', canUpdate: 'Sửa',
  canDelete: 'Xóa', canApprove: 'Duyệt', canExport: 'Xuất', canConfig: 'Cấu hình',
};

// ── Role badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: GlobalRole }) {
  const def = GLOBAL_ROLES.find((r) => r.value === role);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${def?.color ?? 'bg-gray-100 text-gray-500'}`}>
      <Shield className="h-3 w-3" />
      {def?.label ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      status === 'active' ? 'bg-green-100 text-green-700' :
      status === 'inactive' ? 'bg-gray-100 text-gray-500' :
      'bg-yellow-100 text-yellow-700'
    }`}>
      {status === 'active' ? 'Hoạt động' : status === 'inactive' ? 'Tạm ngừng' : 'Mời'}
    </span>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── User Form Modal ────────────────────────────────────────────────────────────
interface UserFormProps {
  user?: OmesUser | null;
  onClose: () => void;
  onSave: (data: Partial<OmesUser>) => void;
  saving: boolean;
}

function UserFormModal({ user, onClose, onSave, saving }: UserFormProps) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? '',
    globalRole: (user?.globalRole ?? 'employee') as GlobalRole,
    department: user?.department ?? '',
    phone: user?.phone ?? '',
    status: (user?.status ?? 'active') as OmesUser['status'],
  });

  const field = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Họ tên *</label>
              <input value={form.name} onChange={(e) => field('name', e.target.value)} className="input-base w-full" placeholder="Nguyễn Văn A" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
              <input type="email" value={form.email} onChange={(e) => field('email', e.target.value)} className="input-base w-full" placeholder="user@company.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Chức danh</label>
              <input value={form.role} onChange={(e) => field('role', e.target.value)} className="input-base w-full" placeholder="Developer" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phòng ban</label>
              <SearchableSelect
                value={form.department}
                onChange={(v) => field('department', v)}
                options={[{ value: '', label: '-- Chọn --' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
                placeholder="-- Chọn --"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vai trò hệ thống</label>
              <SearchableSelect
                value={form.globalRole}
                onChange={(v) => field('globalRole', v)}
                options={GLOBAL_ROLES.map((r) => ({ value: r.value, label: r.label }))}
                placeholder="Chọn vai trò"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Trạng thái</label>
              <SearchableSelect
                value={form.status}
                onChange={(v) => field('status', v)}
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
              <input value={form.phone} onChange={(e) => field('phone', e.target.value)} className="input-base w-full" placeholder="+84..." />
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

// ── Permission Matrix Panel ────────────────────────────────────────────────────
interface PermPanelProps {
  user: OmesUser;
  onClose: () => void;
}

const MODULE_ROLE_DEFAULTS: Record<GlobalRole, Record<keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>, boolean>> = {
  super_admin: { canView: true,  canCreate: true,  canUpdate: true,  canDelete: true,  canApprove: true,  canExport: true,  canConfig: true  },
  admin:       { canView: true,  canCreate: true,  canUpdate: true,  canDelete: true,  canApprove: true,  canExport: true,  canConfig: false },
  manager:     { canView: true,  canCreate: true,  canUpdate: true,  canDelete: false, canApprove: true,  canExport: true,  canConfig: false },
  employee:    { canView: true,  canCreate: true,  canUpdate: true,  canDelete: false, canApprove: false, canExport: false, canConfig: false },
  viewer:      { canView: true,  canCreate: false, canUpdate: false, canDelete: false, canApprove: false, canExport: false, canConfig: false },
};

function PermissionPanel({ user, onClose }: PermPanelProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<UserModuleOverride[]>({
    queryKey: ['user-perms', user.id],
    queryFn: async () => {
      const r = await fetch(`/api/users/${user.id}/permissions`);
      const j = await r.json();
      return j.data ?? [];
    },
  });

  const savePerm = useMutation({
    mutationFn: async (override: UserModuleOverride) => {
      await fetch(`/api/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-perms', user.id] }),
  });

  const defaults = MODULE_ROLE_DEFAULTS[user.globalRole];
  const overrides = data ?? [];

  const getEffective = (moduleCode: ModuleCode) => {
    const ov = overrides.find((o) => o.moduleCode === moduleCode);
    return ov ?? { ...defaults, userId: user.id, moduleCode };
  };

  const toggle = (moduleCode: ModuleCode, action: keyof Omit<UserModuleOverride, 'userId' | 'moduleCode'>) => {
    const current = getEffective(moduleCode);
    savePerm.mutate({ ...current, [action]: !current[action] });
  };

  const modules = MODULE_REGISTRY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{user.name}</h2>
              <p className="text-xs text-gray-500">{user.email} · <RoleBadge role={user.globalRole} /></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <p className="text-xs text-gray-500 mb-3">
            Mặc định từ vai trò <strong>{GLOBAL_ROLES.find(r => r.value === user.globalRole)?.label}</strong>.
            Tích/bỏ tích để override riêng cho người dùng này.
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500 animate-pulse">Đang tải...</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 w-40">Module</th>
                    {MODULE_ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-2 text-center font-medium text-gray-500 text-xs">{ACTION_LABELS[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => {
                    const eff = getEffective(mod.code);
                    const hasOverride = overrides.some((o) => o.moduleCode === mod.code);
                    return (
                      <tr key={mod.code} className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors ${hasOverride ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {mod.label}
                            {hasOverride && <span className="text-[10px] bg-blue-100 text-blue-600 rounded px-1">custom</span>}
                          </div>
                        </td>
                        {MODULE_ACTIONS.map((action) => {
                          const val = eff[action as keyof typeof eff] as boolean;
                          return (
                            <td key={action} className="px-2 py-2.5 text-center">
                              <button
                                onClick={() => toggle(mod.code, action)}
                                className={`h-5 w-5 rounded border-2 mx-auto flex items-center justify-center transition-colors ${
                                  val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-400'
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
          )}
        </div>

        <div className="flex justify-end px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Modal ───────────────────────────────────────────────────────────────
function InviteModal({
  onClose,
  onSend,
  sending,
  sent,
}: {
  onClose: () => void;
  onSend: (email: string, name: string, role: GlobalRole) => void;
  sending: boolean;
  sent: boolean;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<GlobalRole>('employee');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Mời người dùng</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        {sent ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">Lời mời đã được gửi!</h3>
            <p className="text-sm text-gray-500">
              Người dùng <strong>{email}</strong> sẽ nhận được email kích hoạt tài khoản.
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              (Môi trường demo — email không được gửi thực, tài khoản đã được tạo với trạng thái &quot;Mời&quot;)
            </p>
            <button onClick={onClose} className="mt-2 px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Nhập thông tin để gửi lời mời. Người được mời sẽ nhận email kích hoạt tài khoản.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base w-full"
                  placeholder="user@company.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Họ tên</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base w-full"
                  placeholder="Nguyễn Văn A (không bắt buộc)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Vai trò hệ thống</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as GlobalRole)}
                  className="input-base w-full"
                >
                  {GLOBAL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button
                onClick={() => onSend(email, name, role)}
                disabled={sending || !email.includes('@')}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <Send className="h-4 w-4" />
                }
                Gửi lời mời
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<GlobalRole | ''>('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editUser, setEditUser] = useState<OmesUser | null | false>(false); // false = closed, null = new
  const [permUser, setPermUser] = useState<OmesUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<OmesUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const { data, isLoading } = useQuery<OmesUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await fetch('/api/users');
      const j = await r.json();
      return j.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<OmesUser> & { id?: string }) => {
      const url = payload.id ? `/api/users/${payload.id}` : '/api/users';
      const method = payload.id ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('Lỗi lưu người dùng');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteConfirm(null); },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, name, globalRole }: { email: string; name: string; globalRole: GlobalRole }) => {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || email.split('@')[0], globalRole, role: '', department: '', status: 'invited' }),
      });
      if (!r.ok) throw new Error('Lỗi gửi lời mời');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setInviteSent(true);
    },
  });

  const users: OmesUser[] = data ?? [];

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q)) return false;
    if (filterRole && u.globalRole !== filterRole) return false;
    if (filterDept && u.department !== filterDept) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    return true;
  });

  const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)));

  const handleSave = useCallback((formData: Partial<OmesUser>) => {
    const id = editUser && (editUser as OmesUser).id ? (editUser as OmesUser).id : undefined;
    saveMutation.mutate({ ...formData, ...(id ? { id } : {}) });
  }, [editUser, saveMutation]);

  // Stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    admins: users.filter((u) => u.globalRole === 'admin' || u.globalRole === 'super_admin').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    invited: users.filter((u) => u.status === 'invited').length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tài khoản, vai trò và phân quyền module</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setInviteOpen(true); setInviteSent(false); }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Mail className="h-4 w-4" /> Mời người dùng
          </button>
          <button
            onClick={() => setEditUser(null)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Thêm người dùng
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tổng số', value: stats.total, Icon: Users, color: 'text-blue-600' },
          { label: 'Đang hoạt động', value: stats.active, Icon: UserCheck, color: 'text-green-600' },
          { label: 'Admin', value: stats.admins, Icon: Shield, color: 'text-orange-600' },
          { label: 'Tạm ngừng', value: stats.inactive, Icon: UserX, color: 'text-gray-500' },
          { label: 'Chờ kích hoạt', value: stats.invited, Icon: Mail, color: 'text-yellow-600' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, email, chức danh..."
            className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <SearchableSelect
          value={filterRole}
          onChange={(v) => setFilterRole(v as GlobalRole | '')}
          options={[{ value: '', label: 'Tất cả vai trò' }, ...GLOBAL_ROLES.map((r) => ({ value: r.value, label: r.label }))]}
          placeholder="Tất cả vai trò"
        />
        <SearchableSelect
          value={filterDept}
          onChange={setFilterDept}
          options={[{ value: '', label: 'Tất cả phòng ban' }, ...departments.map((d) => ({ value: d, label: d }))]}
          placeholder="Tất cả phòng ban"
        />
        <SearchableSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Hoạt động' },
            { value: 'inactive', label: 'Tạm ngừng' },
            { value: 'invited', label: 'Mời' },
          ]}
          placeholder="Tất cả trạng thái"
        />
        {(search || filterRole || filterDept || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterRole(''); setFilterDept(''); setFilterStatus(''); }} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <X className="h-3 w-3" /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-gray-500 animate-pulse">Đang tải...</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Người dùng</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Chức danh</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Phòng ban</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vai trò HT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Đăng nhập cuối</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">Không tìm thấy người dùng</td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/users/${user.id}`} className="flex items-center gap-3 group">
                      <Avatar name={user.name} size="sm" />
                      <div>
                        <div className="font-medium group-hover:text-blue-600 transition-colors">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.role || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{user.department || '—'}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.globalRole} /></td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {user.status === 'invited' && (
                        <button
                          onClick={() => inviteMutation.mutate({ email: user.email, name: user.name, globalRole: user.globalRole })}
                          title="Gửi lại lời mời"
                          className="p-1.5 rounded-lg hover:bg-yellow-50 hover:text-yellow-700 text-gray-500 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setPermUser(user)}
                        title="Phân quyền module"
                        className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditUser(user)}
                        title="Chỉnh sửa"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user)}
                        title="Xóa"
                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">{filtered.length} / {users.length} người dùng</p>

      {/* Modals */}
      {editUser !== false && (
        <UserFormModal
          user={editUser}
          onClose={() => setEditUser(false)}
          onSave={handleSave}
          saving={saveMutation.isPending}
        />
      )}

      {permUser && (
        <PermissionPanel user={permUser} onClose={() => setPermUser(null)} />
      )}

      {inviteOpen && (
        <InviteModal
          onClose={() => { setInviteOpen(false); setInviteSent(false); }}
          onSend={(email, name, role) => inviteMutation.mutate({ email, name, globalRole: role })}
          sending={inviteMutation.isPending}
          sent={inviteSent}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Xóa người dùng?</h3>
                <p className="text-sm text-gray-500">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-sm mb-5">
              Bạn có chắc muốn xóa <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
