'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlignJustify,
  AlignLeft,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Folder,
  Hash,
  LayoutList,
  Maximize2,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Rows3,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonalTaskModal } from '@/components/omes/personal-task-modal';
import { SearchableSelect } from './ui';

// �"?�"?�"? Types �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

type MyTask = {
  id: string;
  code: string;
  projectId: string | null;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee: string;
  reporter?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  projectCode: string;
  isPersonal: boolean;
};

type WorkSummary = {
  tasks: { total: number; todo: number; inProgress: number; review: number; done: number; blocked: number; overdue: number };
};

type AuthUser = { id: string; fullName: string; email: string; globalRole: string };
type OmesUser = { id: string; name: string; status: 'active' | 'inactive' | 'invited' };
type CommentAttachment = { id: string; url: string; fileName: string; mimeType: string; size: number };
type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  mentionUserIds?: string[];
  attachments?: CommentAttachment[];
};
type SortField = 'dueDate' | 'priority' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
type ListMeta = { total: number; page: number; pageSize: number; totalPages: number; sortBy: string; sortDirection: string };

// �"?�"?�"? Constants �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

const PAGE_SIZE = 10;

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_END = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Quản trị viên',
  manager: 'Quản lý',
  employee: 'Nhân viên',
  viewer: 'Xem',
};

const TASK_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Todo: { label: 'Chờ làm', cls: 'bg-gray-100 text-gray-600' },
  'In Progress': { label: 'Đang làm', cls: 'bg-blue-100 text-blue-700' },
  Review: { label: 'Đang review', cls: 'bg-purple-100 text-purple-700' },
  Done: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-700' },
  Blocked: { label: 'Bị chặn', cls: 'bg-red-100 text-red-700' },
  Cancelled: { label: 'Hủy', cls: 'bg-gray-100 text-gray-400' },
};

const STATUS_OPTIONS = [
  { value: 'Todo', label: 'Chờ làm' },
  { value: 'In Progress', label: 'Đang làm' },
  { value: 'Review', label: 'Đang review' },
  { value: 'Done', label: 'Hoàn thành' },
  { value: 'Blocked', label: 'Bị chặn' },
  { value: 'Cancelled', label: 'Hủy' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'Cao' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'Low', label: 'Thấp' },
] as const;

const PRIORITY_CLS: Record<string, string> = {
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-gray-100 text-gray-500',
};

/** Quick-status buttons: one-click status transitions */
const QUICK_ACTIONS: Record<string, { label: string; nextStatus: string; cls: string } | undefined> = {
  Todo: { label: '▶ Bắt đầu', nextStatus: 'In Progress', cls: 'text-blue-600 hover:bg-blue-50 border-blue-200' },
  'In Progress': { label: '✓ Xong', nextStatus: 'Done', cls: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200' },
  Blocked: { label: '↺ Tiếp tục', nextStatus: 'In Progress', cls: 'text-amber-600 hover:bg-amber-50 border-amber-200' },
};

// �"?�"?�"? Time-grouping �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

type TimeGroup = 'overdue' | 'today' | 'this-week' | 'later' | 'no-date' | 'done';

const GROUP_ORDER: TimeGroup[] = ['overdue', 'today', 'this-week', 'later', 'no-date', 'done'];

const GROUP_META: Record<TimeGroup, { label: string; headerBg: string; headerText: string; headerBorder: string; badgeCls: string }> = {
  overdue:    { label: '⚠ Quá hạn',           headerBg: 'bg-red-50',     headerText: 'text-red-700',     headerBorder: 'border-red-200',     badgeCls: 'bg-red-100 text-red-700' },
  today:      { label: '• Hôm nay',           headerBg: 'bg-orange-50',  headerText: 'text-orange-700',  headerBorder: 'border-orange-200',  badgeCls: 'bg-orange-100 text-orange-700' },
  'this-week':{ label: '• Tuần này',          headerBg: 'bg-blue-50',    headerText: 'text-blue-700',    headerBorder: 'border-blue-200',    badgeCls: 'bg-blue-100 text-blue-700' },
  later:      { label: '• Sau này',            headerBg: 'bg-gray-50',    headerText: 'text-gray-600',    headerBorder: 'border-gray-200',    badgeCls: 'bg-gray-100 text-gray-600' },
  'no-date':  { label: '• Không có hạn',       headerBg: 'bg-gray-50',    headerText: 'text-gray-500',    headerBorder: 'border-gray-100',    badgeCls: 'bg-gray-100 text-gray-500' },
  done:       { label: '✓ Hoàn thành / Hủy',  headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', headerBorder: 'border-emerald-200', badgeCls: 'bg-emerald-100 text-emerald-700' },
};

function getTimeGroup(dueDate: string, status: string): TimeGroup {
  if (status === 'Done' || status === 'Cancelled') return 'done';
  if (!dueDate) return 'no-date';
  if (dueDate < TODAY) return 'overdue';
  if (dueDate === TODAY) return 'today';
  if (dueDate <= WEEK_END) return 'this-week';
  return 'later';
}

function Pill({ value }: { value: string }) {
  const entry = TASK_STATUS_MAP[value] ?? { label: value, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}>{entry.label}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CLS[value] ?? 'bg-gray-100 text-gray-500'}`}>{value}</span>;
}

function OverdueBadge({ dueDate, status }: { dueDate: string; status: string }) {
  const closed = status === 'Done' || status === 'Cancelled';
  if (closed || !dueDate) return null;
  if (dueDate < TODAY) {
    return <span className="ml-1 text-[10px] bg-red-100 text-red-600 rounded px-1 py-0.5 font-medium">Quá hạn</span>;
  }
  return null;
}

function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
      <CheckSquare className="w-10 h-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// �"?�"?�"? Focus Zone �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function TodayFocusZone({
  tasks,
  updatingId,
  onQuickStatus,
}: {
  tasks: MyTask[];
  updatingId: string | null;
  onQuickStatus: (task: MyTask, nextStatus: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="px-6 pb-2 shrink-0">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Ưu tiên cần xử lý</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          {tasks.map((task) => {
            const action = QUICK_ACTIONS[task.status];
            const isUpdating = updatingId === task.id;
            const isOverdue = task.dueDate && task.dueDate < TODAY;
            return (
              <div
                key={task.id}
                className="flex-shrink-0 bg-white rounded-lg border border-amber-200 p-2 w-48 shadow-sm flex flex-col gap-1"
              >
                <div className="flex items-center gap-1 flex-wrap">
                  <Pill value={task.status} />
                  {isOverdue && (
                    <span className="text-[10px] bg-red-100 text-red-600 rounded px-1 font-medium">
                      Quá hạn
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate" title={task.title}>
                  {task.title}
                </p>
                <p className="text-xs text-gray-400">
                  {task.isPersonal ? 'Cá nhân' : task.projectCode}
                  {task.dueDate ? ` · ${task.dueDate}` : ''}
                </p>
                {action && (
                  <button
                    onClick={() => onQuickStatus(task, action.nextStatus)}
                    disabled={isUpdating}
                    className={`mt-auto w-full text-xs px-1.5 py-0.5 rounded border font-medium transition-colors ${action.cls} disabled:opacity-50`}
                  >
                    {isUpdating ? '...' : action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// �"?�"?�"? Table header (shared) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function TaskTableHead() {
  return (
    <thead>
      <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
        <th className="text-left px-4 py-2.5 font-medium w-24">Mã</th>
        <th className="text-left px-4 py-2.5 font-medium">Tiêu đề</th>
        <th className="text-left px-4 py-2.5 font-medium w-32">Nguồn</th>
        <th className="text-left px-4 py-2.5 font-medium w-32">Trạng thái</th>
        <th className="text-left px-4 py-2.5 font-medium w-24">Ưu tiên</th>
        <th className="text-left px-4 py-2.5 font-medium w-36">Hạn chót</th>
        <th className="text-left px-4 py-2.5 font-medium w-40">Tác vụ</th>
      </tr>
    </thead>
  );
}

// �"?�"?�"? Task Row �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function TaskRow({
  task,
  updatingId,
  onQuickStatus,
  onOpenDetail,
  onOpenDiscuss,
  onRemove,
}: {
  task: MyTask;
  updatingId: string | null;
  onQuickStatus: (task: MyTask, nextStatus: string) => void;
  onOpenDetail: (task: MyTask) => void;
  onOpenDiscuss: (task: MyTask) => void;
  onRemove: (task: MyTask) => void;
}) {
  const action = QUICK_ACTIONS[task.status];
  const isUpdating = updatingId === task.id;
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{task.code}</td>
      <td className="px-4 py-2.5 max-w-xs">
        <p className="text-gray-800 font-medium truncate" title={task.title}>{task.title}</p>
        
      </td>
      <td className="px-4 py-2.5">
        {task.isPersonal ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Cá nhân</span>
        ) : (
          <Link href={`/projects/${task.projectId}?tab=work`} className="text-xs text-blue-600 hover:underline">
            {task.projectCode || task.projectName}
          </Link>
        )}
      </td>
      <td className="px-4 py-2.5"><Pill value={task.status} /></td>
      <td className="px-4 py-2.5"><PriorityBadge value={task.priority} /></td>
      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
        {task.dueDate || '-'}
        {task.dueDate && <OverdueBadge dueDate={task.dueDate} status={task.status} />}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {/* One-click status transition */}
          {action && (
            <button
              onClick={() => onQuickStatus(task, action.nextStatus)}
              disabled={isUpdating}
              className={`text-xs px-2 py-1 rounded border font-medium transition-colors whitespace-nowrap ${action.cls} disabled:opacity-50`}
            >
              {isUpdating ? '...' : action.label}
            </button>
          )}
          {/* Secondary actions */}
          <button
            onClick={() => onOpenDetail(task)}
            className="text-gray-400 hover:text-blue-600"
            title="Chi tiết"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenDiscuss(task)}
            className="text-gray-400 hover:text-indigo-600"
            title="Trao đổi"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {task.isPersonal ? (
            <button onClick={() => onRemove(task)} className="text-gray-400 hover:text-red-600" title="Xóa">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <Link href={`/projects/${task.projectId}?tab=work&taskId=${task.id}`} title="Xem trong dự án">
              <ChevronRight className="w-4 h-4 text-gray-300 hover:text-blue-500" />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// �"?�"?�"? Grouped View �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function GroupedTaskView({
  tasks,
  updatingId,
  onQuickStatus,
  onOpenDetail,
  onOpenDiscuss,
  onRemove,
}: {
  tasks: MyTask[];
  updatingId: string | null;
  onQuickStatus: (task: MyTask, nextStatus: string) => void;
  onOpenDetail: (task: MyTask) => void;
  onOpenDiscuss: (task: MyTask) => void;
  onRemove: (task: MyTask) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<TimeGroup>>(new Set(['done']));

  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, MyTask[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const t of tasks) map.get(getTimeGroup(t.dueDate, t.status))!.push(t);
    return map;
  }, [tasks]);

  const toggleGroup = (g: TimeGroup) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const nonEmptyGroups = GROUP_ORDER.filter((g) => (grouped.get(g)?.length ?? 0) > 0);

  return (
    <div className="space-y-3">
      {nonEmptyGroups.map((g) => {
        const groupTasks = grouped.get(g)!;
        const meta = GROUP_META[g];
        const isCollapsed = collapsed.has(g);
        return (
          <div key={g} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${meta.headerBorder}`}>
            <button
              onClick={() => toggleGroup(g)}
              className={`w-full flex items-center justify-between px-4 py-2.5 ${meta.headerBg} ${meta.headerText} border-b ${meta.headerBorder}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{meta.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${meta.badgeCls}`}>
                  {groupTasks.length}
                </span>
              </div>
              {isCollapsed ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronUp className="w-4 h-4 opacity-60" />}
            </button>
            {!isCollapsed && (
              <table className="w-full text-sm">
                <TaskTableHead />
                <tbody>
                  {groupTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      updatingId={updatingId}
                      onQuickStatus={onQuickStatus}
                      onOpenDetail={onOpenDetail}
                      onOpenDiscuss={onOpenDiscuss}
                      onRemove={onRemove}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskDiscussionDrawer({
  task,
  comments,
  users,
  initialTab,
  onClose,
  onSend,
  sending,
  onSave,
  saving,
}: {
  task: MyTask | null;
  comments: TaskComment[];
  users: OmesUser[];
  initialTab?: 'details' | 'history' | 'comments';
  onClose: () => void;
  onSend: (input: { content: string; mentionUserIds: string[]; files: File[] }) => Promise<void>;
  sending: boolean;
  onSave?: (updates: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string }) => Promise<void>;
  saving?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'comments'>('details');
  const [content, setContent] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '', status: '', priority: '', dueDate: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task) return;
    setContent('');
    setMentionUserIds([]);
    setFiles([]);
    setPreviewUrls([]);
    setActiveTab(initialTab ?? 'details');
    setMentionQuery(null);
    setEditDraft({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    });
    if (editorRef.current) editorRef.current.innerHTML = '';
  }, [task?.id, initialTab]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [files]);

  if (!task) return null;

  const mentionable = users.filter((u) => u.status === 'active');
  const filteredMentionable = mentionQuery !== null
    ? mentionable.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const ownerName = task.reporter ?? task.assignee;
  const ownerInitials = ownerName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();

  const statusMeta = TASK_STATUS_MAP[task.status] ?? { label: task.status, cls: 'bg-gray-100 text-gray-500' };
  const priorityCls = PRIORITY_CLS[task.priority] ?? 'bg-gray-100 text-gray-500';

  const isDirty = task.isPersonal && (
    editDraft.title !== task.title ||
    editDraft.description !== (task.description ?? '') ||
    editDraft.status !== task.status ||
    editDraft.priority !== task.priority ||
    editDraft.dueDate !== (task.dueDate ?? '')
  );

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
  }

  function readEditorContent() {
    return editorRef.current?.textContent ?? '';
  }

  function syncMentionIdsFromEditor() {
    if (!editorRef.current) {
      setMentionUserIds([]);
      return;
    }
    const ids = Array.from(editorRef.current.querySelectorAll('[data-mention-user-id]'))
      .map((node) => (node as HTMLElement).dataset.mentionUserId)
      .filter((id): id is string => !!id);
    setMentionUserIds(Array.from(new Set(ids)));
  }

  function getTextBeforeCursor() {
    const editor = editorRef.current;
    if (!editor) return '';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return readEditorContent();
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString();
  }

  function handleContentChange() {
    const val = readEditorContent();
    setContent(val);
    const match = getTextBeforeCursor().match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
    syncMentionIdsFromEditor();
  }

  function handleMentionSelect(user: OmesUser) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let range = selection.getRangeAt(0);

    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.endContainer as Text;
      const before = textNode.data.slice(0, range.endOffset);
      const trigger = before.match(/@([^\s@]*)$/);
      if (trigger) {
        const startOffset = range.endOffset - trigger[0].length;
        const replaceRange = document.createRange();
        replaceRange.setStart(textNode, startOffset);
        replaceRange.setEnd(textNode, range.endOffset);
        replaceRange.deleteContents();
        range = replaceRange;
      }
    }

    const mention = document.createElement('span');
    mention.textContent = `@${user.name}`;
    mention.className = 'text-blue-600 font-medium bg-blue-50 rounded px-0.5';
    mention.contentEditable = 'false';
    mention.dataset.mentionUserId = user.id;

    const trailingSpace = document.createTextNode(' ');
    range.insertNode(trailingSpace);
    range.insertNode(mention);

    const caretRange = document.createRange();
    caretRange.setStartAfter(trailingSpace);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);

    setContent(readEditorContent());
    syncMentionIdsFromEditor();
    setMentionQuery(null);
    editor.focus();
  }

  function renderMentionContent(text: string, ids: string[] = []) {
    const labels = ids
      .map((id) => mentionable.find((u) => u.id === id)?.name)
      .filter((name): name is string => !!name)
      .map((name) => `@${name}`)
      .sort((a, b) => b.length - a.length);

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = labels.length > 0
      ? new RegExp(`(${labels.map(escapeRegExp).join('|')}|@[^\\s@]+)`, 'g')
      : /(@[^\s@]+)/g;

    return text.split(pattern).map((part, idx) => (
      part.startsWith('@')
        ? <span key={`m-${idx}`} className="text-blue-600 font-medium">{part}</span>
        : <span key={`t-${idx}`}>{part}</span>
    ));
  }

  async function handleSendClick() {
    const text = readEditorContent().trim();
    if (!text || sending) return;
    await onSend({ content: text, mentionUserIds, files });
    setContent('');
    setMentionQuery(null);
    setMentionUserIds([]);
    setFiles([]);
    if (editorRef.current) editorRef.current.innerHTML = '';
  }

  function resetDraft() {
    setEditDraft({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    });
  }

  const fieldCls = 'w-full text-sm rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white';
  const selectCls = 'text-sm rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white';

  type FieldRow = { icon: React.ReactNode; label: string; content: React.ReactNode };
  const detailFields: FieldRow[] = [
    {
      icon: <AlignLeft className="w-3.5 h-3.5" />,
      label: 'Nội dung công việc',
      content: task.isPersonal
        ? <input type="text" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} className={fieldCls} />
        : <span className="text-sm text-gray-800">{task.title}</span>,
    },
    {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'Trạng thái',
      content: task.isPersonal
        ? <SearchableSelect
            value={editDraft.status}
            onChange={(v) => setEditDraft((d) => ({ ...d, status: v }))}
            options={Object.entries(TASK_STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
            placeholder="Chọn trạng thái"
          />
        : <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.cls}`}>{statusMeta.label}</span>,
    },
    {
      icon: <Folder className="w-3.5 h-3.5" />,
      label: 'Dự án',
      content: task.isPersonal
        ? <span className="text-sm text-gray-500 italic">Cá nhân</span>
        : <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-mono">{task.projectCode}</span>
            <span className="text-sm text-gray-700">{task.projectName}</span>
          </span>,
    },
    {
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      label: 'PM / Owner',
      content: <span className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{ownerInitials}</span>
        <span className="text-sm text-gray-800">{ownerName}</span>
      </span>,
    },
    {
      icon: <AlignJustify className="w-3.5 h-3.5" />,
      label: 'Ghi chú',
      content: task.isPersonal
        ? <textarea rows={2} value={editDraft.description} onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))} className={`${fieldCls} resize-none`} placeholder="Thêm ghi chú..." />
        : task.description
          ? <span className="text-sm text-gray-800 whitespace-pre-wrap">{task.description}</span>
          : <span className="text-sm text-gray-400 italic">—</span>,
    },
    {
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: 'Ngày bắt đầu',
      content: <span className="text-sm text-gray-800">{fmtDate(task.createdAt)}</span>,
    },
    {
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: 'Ngày hoàn thành',
      content: <span className="text-sm text-gray-400">—</span>,
    },
    {
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: 'Deadline',
      content: task.isPersonal
        ? <input type="date" value={editDraft.dueDate ? editDraft.dueDate.slice(0, 10) : ''} onChange={(e) => setEditDraft((d) => ({ ...d, dueDate: e.target.value }))} className={selectCls} />
        : <span className={`text-sm ${task.dueDate ? 'text-gray-800' : 'text-gray-400'}`}>{fmtDate(task.dueDate)}</span>,
    },
    {
      icon: <Hash className="w-3.5 h-3.5" />,
      label: 'Thời gian làm (h)',
      content: <span className="text-sm text-gray-800">0.0</span>,
    },
    {
      icon: <Hash className="w-3.5 h-3.5" />,
      label: 'Ngân sách',
      content: <span className="text-sm text-gray-400">—</span>,
    },
    {
      icon: <Play className="w-3.5 h-3.5" />,
      label: 'Ưu tiên',
      content: task.isPersonal
        ? <SearchableSelect
            value={editDraft.priority}
            onChange={(v) => setEditDraft((d) => ({ ...d, priority: v }))}
            options={[
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
            placeholder="Chọn ưu tiên"
          />
        : <span className={`px-2 py-0.5 rounded border text-xs font-medium ${priorityCls}`}>{task.priority}</span>,
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: 'Thành viên',
      content: <span className="text-sm text-gray-800">0 người</span>,
    },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {task.isPersonal ? 'Cá nhân' : `${task.projectName} · ${task.projectCode}`}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
              {(['details', 'history'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                  {tab === 'details' ? 'Chi tiết' : 'Lịch sử'}
                </button>
              ))}
            </div>
            <button onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${activeTab === 'comments' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}>
              <MessageSquare className="w-3.5 h-3.5" />
              Comment
              {comments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold leading-none">{comments.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">
              {detailFields.map(({ icon, label, content }) => (
                <div key={label} className="grid grid-cols-[132px_minmax(0,1fr)] items-start border-b border-gray-50 px-4 py-2.5 gap-2 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-1.5 min-w-0 text-gray-400">
                    {icon}
                    <span className="text-[13px] text-gray-500">{label}</span>
                  </div>
                  <div className="min-w-0">{content}</div>
                </div>
              ))}
            </div>
            {isDirty && (
              <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 flex items-center justify-end gap-2 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
                <button onClick={resetDraft} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  disabled={saving || !editDraft.title.trim()}
                  onClick={() => onSave?.({ title: editDraft.title, description: editDraft.description, status: editDraft.status, priority: editDraft.priority, dueDate: editDraft.dueDate || undefined })}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Chưa có lịch sử thay đổi.</p>
          </div>
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400">Chưa có trao đổi nào.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 mb-1">{c.authorName} · {new Date(c.createdAt).toLocaleString('vi-VN')}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderMentionContent(c.content, c.mentionUserIds ?? [])}</p>
                    {!!c.attachments?.length && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {c.attachments.map((a) => (
                          a.mimeType?.startsWith('image/') ? (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="group block rounded-lg overflow-hidden border border-gray-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.url} alt={a.fileName} className="w-full h-28 object-cover" />
                              <span className="block px-2 py-1 text-[11px] text-blue-600 group-hover:underline truncate">{a.fileName}</span>
                            </a>
                          ) : (
                            <a key={a.id} href={a.url} target="_blank" className="text-xs text-blue-600 hover:underline" rel="noreferrer">{a.fileName}</a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 p-3 space-y-2 shrink-0">
              {/* Contenteditable with @mention autocomplete */}
              <div className="relative">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
                  data-placeholder="Nhập nội dung trao đổi... Gõ @ để tag người dùng"
                  className="w-full min-h-[84px] text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
                />
                {mentionQuery !== null && filteredMentionable.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-44 overflow-y-auto">
                    {filteredMentionable.map((u) => {
                      const initials = u.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();
                      return (
                        <button key={u.id} type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(u); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">{initials}</span>
                          <span className="text-gray-800">{u.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Image previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {previewUrls.map((url, i) => (
                    <div key={url} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={files[i]?.name} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="relative p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Đính kèm ảnh">
                  <Paperclip className="w-4 h-4" />
                  {files.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {files.length}
                    </span>
                  )}
                </button>
                <div className="flex-1" />
                <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Đóng</button>
                <button disabled={sending || !content.trim()}
                  onClick={handleSendClick}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700">
                  {sending ? 'Đang gửi...' : 'Gửi comment'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WorkManagementPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter state
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  // View state
  const [groupByTime, setGroupByTime] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Quick-action loading state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Discussion drawer state
  const [discussTask, setDiscussTask] = useState<MyTask | null>(null);
  const [discussInitialTab, setDiscussInitialTab] = useState<'details' | 'history' | 'comments'>('details');

  const meQuery = useQuery<{ user: AuthUser }>({
    queryKey: ['auth-me'],
    queryFn: () => fetch('/api/auth/me').then((r) => r.json()),
    staleTime: 60_000,
  });

  const summaryQuery = useQuery<{ data: WorkSummary }>({
    queryKey: ['my-work-summary'],
    queryFn: () => fetch('/api/work/my/summary').then((r) => r.json()),
    staleTime: 0,
  });

  const projectsQuery = useQuery<{ data: Array<{ id: string; projectName: string }> }>({
    queryKey: ['omes-project-overview-select'],
    queryFn: () => fetch('/api/projects/overview', { cache: 'no-store' }).then((r) => r.json()),
    staleTime: 60_000,
  });

  // Independent focus-zone query (no user filters, top 50 by dueDate)
  const focusQuery = useQuery<{ data: MyTask[] }>({
    queryKey: ['my-tasks-focus'],
    queryFn: () =>
      fetch('/api/work/my/tasks?pageSize=50&sortBy=dueDate&sortDirection=asc').then((r) => r.json()),
    staleTime: 0,
  });

  const usersQuery = useQuery<{ data: OmesUser[] }>({
    queryKey: ['users-for-mentions'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    staleTime: 60_000,
  });

  const commentsQuery = useQuery<{ data: TaskComment[] }>({
    queryKey: ['task-comments', discussTask?.id],
    queryFn: () => fetch(`/api/work/my/tasks/${discussTask?.id}/comments`).then((r) => r.json()),
    enabled: !!discussTask,
    staleTime: 0,
  });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filterProject) p.set('projectId', filterProject);
    if (filterStatus) p.set('status', filterStatus);
    if (filterPriority) p.set('priority', filterPriority);
    if (filterOverdue) p.set('overdue', 'true');
    if (groupByTime) {
      p.set('sortBy', 'dueDate');
      p.set('sortDirection', 'asc');
      p.set('pageSize', '200');
    } else {
      p.set('sortBy', sortBy);
      p.set('sortDirection', sortDirection);
      p.set('page', String(page));
      p.set('pageSize', String(PAGE_SIZE));
    }
    return p.toString();
  }, [filterOverdue, filterPriority, filterProject, filterStatus, page, sortBy, sortDirection, groupByTime]);

  const tasksQuery = useQuery<{ data: MyTask[]; meta?: ListMeta }>({
    queryKey: ['my-tasks', qs],
    queryFn: () => fetch(`/api/work/my/tasks${qs ? `?${qs}` : ''}`).then((r) => r.json()),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/work/personal-tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Xóa thất bại');
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
        qc.invalidateQueries({ queryKey: ['my-work-summary'] }),
        qc.invalidateQueries({ queryKey: ['my-tasks-focus'] }),
      ]);
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/work/my/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Cập nhật thất bại');
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
        qc.invalidateQueries({ queryKey: ['my-work-summary'] }),
        qc.invalidateQueries({ queryKey: ['my-tasks-focus'] }),
      ]);
    },
  });

  const sendCommentMutation = useMutation({
    mutationFn: async (input: { taskId: string; content: string; mentionUserIds: string[]; files: File[] }) => {
      let attachments: CommentAttachment[] = [];
      if (input.files.length > 0) {
        const formData = new FormData();
        for (const file of input.files) formData.append('files', file);
        const uploadRes = await fetch('/api/uploads/task-comment-images', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson?.error ?? 'Upload ảnh thất bại');
        attachments = uploadJson.data ?? [];
      }

      const res = await fetch(`/api/work/my/tasks/${input.taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: input.content,
          mentionUserIds: input.mentionUserIds,
          attachments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Gửi comment thất bại');
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['task-comments'] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
  });

  const updatePersonalTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string } }) => {
      const res = await fetch(`/api/work/personal-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Cập nhật thất bại');
      return json;
    },
    onSuccess: async (data) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
        qc.invalidateQueries({ queryKey: ['my-work-summary'] }),
        qc.invalidateQueries({ queryKey: ['my-tasks-focus'] }),
      ]);
      if (data?.data) {
        setDiscussTask((prev) => prev ? { ...prev, ...data.data, isPersonal: true } : prev);
      }
    },
  });

  const tasks = tasksQuery.data?.data ?? [];
  const meta = tasksQuery.data?.meta;
  const projects = projectsQuery.data?.data ?? [];
  const summary = summaryQuery.data?.data?.tasks;
  const user = meQuery.data?.user;
  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? tasks.length;
  const isViewer = user?.globalRole === 'viewer';

  // Focus zone: urgent tasks independent of current filter state
  const focusTasks = useMemo(() => {
    const all: MyTask[] = focusQuery.data?.data ?? [];
    return all
      .filter((t) => {
        const closed = t.status === 'Done' || t.status === 'Cancelled';
        if (closed) return false;
        return (t.dueDate && t.dueDate < TODAY) || t.dueDate === TODAY || (t.priority === 'High' && t.status === 'In Progress');
      })
      .slice(0, 5);
  }, [focusQuery.data]);

  // Role-adaptive KPI cards
  const kpiCards = useMemo(() => {
    const role = user?.globalRole ?? 'employee';
    const s = summary;
    const dueToday = (focusQuery.data?.data ?? []).filter(
      (t) => t.dueDate === TODAY && t.status !== 'Done' && t.status !== 'Cancelled',
    ).length;

    if (role === 'super_admin') {
      return [
        { label: 'Tổng công việc', value: s?.total ?? 0, sub: 'Dự án + cá nhân', color: 'text-blue-700' },
        { label: 'Đang làm', value: s?.inProgress ?? 0, sub: 'In Progress', color: 'text-indigo-700' },
        { label: 'Quá hạn', value: s?.overdue ?? 0, sub: 'Chưa hoàn thành', color: 'text-red-700' },
        { label: 'Hoàn thành', value: s?.done ?? 0, sub: 'Done / Cancelled', color: 'text-emerald-700' },
      ];
    }
    if (role === 'manager') {
      return [
        { label: 'Đang làm', value: s?.inProgress ?? 0, sub: 'In Progress', color: 'text-blue-700' },
        { label: 'Bị chặn', value: s?.blocked ?? 0, sub: 'Blocked • cần gỡ', color: 'text-red-700' },
        { label: 'Quá hạn', value: s?.overdue ?? 0, sub: 'Cần xử lý ngay', color: 'text-orange-700' },
        { label: 'Cần review', value: s?.review ?? 0, sub: 'Đang review', color: 'text-purple-700' },
      ];
    }
    if (role === 'viewer') {
      return [
        { label: 'Tổng công việc', value: s?.total ?? 0, sub: 'Được giao', color: 'text-blue-700' },
        { label: 'Đang xử lý', value: (s?.inProgress ?? 0) + (s?.review ?? 0), sub: 'In Progress + Review', color: 'text-indigo-700' },
        { label: 'Hoàn thành', value: s?.done ?? 0, sub: 'Done', color: 'text-emerald-700' },
        { label: 'Quá hạn', value: s?.overdue ?? 0, sub: 'Chưa hoàn thành', color: 'text-red-700' },
      ];
    }
    // employee (default)
    return [
      { label: 'Hôm nay', value: dueToday, sub: 'Deadline hôm nay', color: 'text-orange-600' },
      { label: 'Đang làm', value: s?.inProgress ?? 0, sub: 'In Progress', color: 'text-blue-700' },
      { label: 'Quá hạn', value: s?.overdue ?? 0, sub: 'Chưa hoàn thành', color: 'text-red-700' },
      { label: 'Hoàn thành', value: s?.done ?? 0, sub: 'Done / Cancelled', color: 'text-emerald-700' },
    ];
  }, [user?.globalRole, summary, focusQuery.data]);

  const clearFilters = () => {
    setFilterProject('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterOverdue(false);
    setPage(1);
  };

  const openCreate = () => {
    setModalOpen(true);
  };

  const removeTask = (task: MyTask) => {
    if (!window.confirm(`Xóa công việc cá nhân "${task.title}"?`)) return;
    deleteMutation.mutate(task.id);
  };

  const handleQuickStatus = (task: MyTask, nextStatus: string) => {
    setUpdatingId(task.id);
    quickStatusMutation.mutate({ id: task.id, status: nextStatus }, { onSettled: () => setUpdatingId(null) });
  };

  const lastOpenRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  const openTaskById = (taskId: string, tab: 'details' | 'history' | 'comments') => {
    const dedupeKey = `${taskId}|${tab}`;
    const now = Date.now();
    if (lastOpenRef.current.key === dedupeKey && now - lastOpenRef.current.at < 250) return;
    lastOpenRef.current = { key: dedupeKey, at: now };

    const found = tasks.find((t) => t.id === taskId);
    const fallback: MyTask = {
      id: taskId,
      code: 'TASK',
      projectId: null,
      title: 'Công việc từ thông báo',
      description: '',
      status: 'In Progress',
      priority: 'Medium',
      assignee: user?.fullName ?? 'Người dùng',
      reporter: user?.fullName ?? 'Hệ thống',
      dueDate: TODAY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectName: '',
      projectCode: '',
      isPersonal: false,
    };
    const nextTask = found ? { ...found } : fallback;
    setDiscussInitialTab(tab);
    setDiscussTask(nextTask);
  };

  const handleOpenDetail = (task: MyTask) => {
    setDiscussInitialTab('details');
    setDiscussTask(task);
  };

  const handleOpenDiscuss = (task: MyTask) => {
    setDiscussInitialTab('comments');
    setDiscussTask(task);
  };

  const handleSendComment = async (input: { content: string; mentionUserIds: string[]; files: File[] }) => {
    if (!discussTask) return;
    await sendCommentMutation.mutateAsync({ taskId: discussTask.id, ...input });
  };

  const handleSave = async (updates: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string }) => {
    if (!discussTask) return;
    await updatePersonalTaskMutation.mutateAsync({ id: discussTask.id, updates });
  };

  const qsTaskId = searchParams.get('taskId');
  const qsOpenTab = searchParams.get('openTab');
  const qsNonce = searchParams.get('_nt');

  useEffect(() => {
    if (!qsTaskId) return;
    openTaskById(qsTaskId, qsOpenTab === 'comments' ? 'comments' : 'details');
  }, [tasks, qsTaskId, qsOpenTab, qsNonce]);

  useEffect(() => {
    const onOpenFromNotification = (event: Event) => {
      const custom = event as CustomEvent<{ taskId?: string; openTab?: string }>;
      const taskId = custom.detail?.taskId;
      if (!taskId) return;
      openTaskById(taskId, custom.detail?.openTab === 'comments' ? 'comments' : 'details');
    };

    window.addEventListener('omes:open-task-from-notification', onOpenFromNotification);
    return () => window.removeEventListener('omes:open-task-from-notification', onOpenFromNotification);
  }, [tasks]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-semibold text-gray-900">Công việc của tôi</h1>
          {user && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{user.fullName}</span>
          )}
          {user && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {ROLE_LABELS[user.globalRole] ?? user.globalRole}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Bao gồm công việc trong dự án và công việc cá nhân/hàng ngày.</p>
      </div>

      {/* Focus Zone • only shown when there are urgent tasks */}
      <TodayFocusZone tasks={focusTasks} updatingId={updatingId} onQuickStatus={handleQuickStatus} />

      {/* Filter & View Controls */}
      <div className="px-6 pb-1 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <SearchableSelect
            value={filterProject}
            onChange={(v) => { setFilterProject(v); setPage(1); }}
            options={[
              { value: '', label: 'Tất cả nguồn' },
              { value: 'personal', label: 'Cá nhân' },
              ...projects.map((p) => ({ value: p.id, label: p.projectName })),
            ]}
            placeholder="Tất cả nguồn"
          />

          <SearchableSelect
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            placeholder="Tất cả trạng thái"
          />

          <SearchableSelect
            value={filterPriority}
            onChange={(v) => { setFilterPriority(v); setPage(1); }}
            options={[
              { value: '', label: 'Tất cả ưu tiên' },
              ...PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
            ]}
            placeholder="Tất cả ưu tiên"
          />

          {/* Sort controls • only in flat list mode */}
          {!groupByTime && (
            <>
              <SearchableSelect
                value={sortBy}
                onChange={(v) => { setSortBy(v as SortField); setPage(1); }}
                options={[
                  { value: 'dueDate', label: 'Sắp theo hạn chót' },
                  { value: 'priority', label: 'Sắp theo ưu tiên' },
                  { value: 'status', label: 'Sắp theo trạng thái' },
                  { value: 'updatedAt', label: 'Sắp theo cập nhật' },
                ]}
                placeholder="Sắp xếp"
              />
              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? 'Tăng dần ↑' : 'Giảm dần ↓'}
              </button>
            </>
          )}

          <button
            onClick={() => { setFilterOverdue((v) => !v); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              filterOverdue ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Quá hạn
          </button>

          {/* Group / Flat toggle */}
          <button
            onClick={() => { setGroupByTime((v) => !v); setPage(1); }}
            title={groupByTime ? 'Phân nhóm theo thời gian • click đă xem danh sách phẳng' : 'Click đă phân nhóm theo thời gian'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              groupByTime ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {groupByTime ? <Rows3 className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            {groupByTime ? 'Phân nhóm' : 'Danh sách'}
          </button>

          {/* Add button • hidden for viewers */}
          {!isViewer && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm công việc
            </button>
          )}

          <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline px-1">Xóa lọc</button>
          <span className="ml-auto text-xs text-gray-400">{totalItems} công việc</span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {tasksQuery.isPending ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            <TrendingUp className="w-4 h-4 mr-2 opacity-50" /> Đang tải...
          </div>
        ) : totalItems === 0 ? (
          <EmptyState
            message={
              isViewer
                ? 'Không có công việc nào được giao cho bạn.'
                : 'Không có công việc nào. Thử bỏ bộ lọc hoặc tạo công việc cá nhân mới.'
            }
          />
        ) : groupByTime ? (
          <GroupedTaskView
            tasks={tasks}
            updatingId={updatingId}
            onQuickStatus={handleQuickStatus}
            onOpenDetail={handleOpenDetail}
            onOpenDiscuss={handleOpenDiscuss}
            onRemove={removeTask}
          />
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <TaskTableHead />
                <tbody>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      updatingId={updatingId}
                      onQuickStatus={handleQuickStatus}
                      onOpenDetail={handleOpenDetail}
                      onOpenDiscuss={handleOpenDiscuss}
                      onRemove={removeTask}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="text-gray-500">Trang {page}/{totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <TaskDiscussionDrawer
        task={discussTask}
        comments={commentsQuery.data?.data ?? []}
        users={usersQuery.data?.data ?? []}
        initialTab={discussInitialTab}
        onClose={() => {
          setDiscussTask(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('taskId');
          url.searchParams.delete('openTab');
          url.searchParams.delete('_nt');
          router.replace(url.pathname + url.search, { scroll: false });
        }}
        onSend={handleSendComment}
        sending={sendCommentMutation.isPending}
        onSave={handleSave}
        saving={updatePersonalTaskMutation.isPending}
      />

      <PersonalTaskModal
        open={modalOpen}
        task={null}
        onClose={() => {
          setModalOpen(false);
        }}
      />
    </div>
  );
}









