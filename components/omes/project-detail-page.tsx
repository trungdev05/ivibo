'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusPill, SearchableSelect, type SelectOption } from './ui';
import { SmartTable } from './smart-table';
import type { ColDef } from './smart-table';
import { ActivityLog, ChangeLogEntry, DailyUpdate, DocType, Issue, MonthlyReport, OmesModule, OmesProject, OmesTask, ProjectDocument, ProjectMilestone, Requirement, RequirementStatus, RequirementType, Resource, Risk, SlaRequest } from '@/lib/omes-types';
import { WorkBase } from '@/components/workbase/workbase';
import { ArrowLeft, BookOpen, Check, ClipboardList, Edit2, FileText, Flag, FolderOpen, Plus, Rss, Ticket, Trash2, Users, X } from 'lucide-react';

// ── Toast system ───────────────────────────────────────────────────────────────
type Toast = { id: number; type: 'success' | 'error'; message: string };
let _toastId = 0;
let _toastSetter: ((fn: (t: Toast[]) => Toast[]) => void) | null = null;

function toast(type: 'success' | 'error', message: string) {
  if (!_toastSetter) return;
  const id = ++_toastId;
  _toastSetter((prev) => [...prev, { id, type, message }]);
  setTimeout(() => _toastSetter!((prev) => prev.filter((t) => t.id !== id)), 4000);
}
export const toastSuccess = (msg: string) => toast('success', msg);
export const toastError = (msg: string) => toast('error', msg);

function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => { _toastSetter = setToasts; return () => { _toastSetter = null; }; }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg pointer-events-auto ${t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {t.type === 'success'
            ? <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Confirm dialog hook ────────────────────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback((message: string) => new Promise<boolean>((resolve) => setState({ message, resolve })), []);
  const Dialog = state ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <p className="text-sm text-gray-800 mb-5">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => { state.resolve(false); setState(null); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
          <button onClick={() => { state.resolve(true); setState(null); }} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium">Xác nhận xóa</button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirm, Dialog };
}

type Props = {
  projectId: string;
  activeTab: string;
  /** Base path for tab links. Defaults to /projects */
  basePath?: string;
  /** If set, WorkBase will open this task's detail panel automatically. */
  openTaskId?: string;
};

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function DatePicker({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = value ? (() => { const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`; })() : '';
  return (
    <div
      className={`relative flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-300 transition-all cursor-pointer ${!value ? 'text-gray-400' : 'text-gray-800'} ${className ?? ''}`}
      onClick={() => { inputRef.current?.showPicker?.(); inputRef.current?.focus(); }}
    >
      <span className="text-sm pointer-events-none select-none">{formatted || placeholder || 'dd/mm/yyyy'}</span>
      <svg className="h-4 w-4 text-gray-400 shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
}

function isDoneLikeStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'done' || s === 'closed' || s === 'resolved' || s === 'completed';
}

function isOverdueDate(dueDate?: string, status?: string) {
  if (!dueDate || !status) return false;
  return new Date(dueDate).getTime() < Date.now() && !isDoneLikeStatus(status);
}

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: BookOpen },
  { key: 'work', label: 'Công việc', icon: ClipboardList },
  { key: 'requirement', label: 'Requirement', icon: FileText },
  { key: 'ticket', label: 'Ticket', icon: Ticket },
  { key: 'milestone', label: 'Milestone', icon: Flag },
  { key: 'documents', label: 'Tài liệu', icon: FolderOpen },
  { key: 'members', label: 'Thành viên', icon: Users },
  { key: 'activity', label: 'Hoạt động', icon: Rss },
] as const;

type ProjectDetailResponse = {
  project: OmesProject;
  modules: OmesModule[];
  timeline: Array<{ phase: string; startDate: string; endDate: string; owner: string; status: string; dependencies: string; delay: boolean }>;
  risks: Risk[];
  sla: SlaRequest[];
  resources: Resource[];
  reports: MonthlyReport[];
  issues: Issue[];
  dailyUpdates: DailyUpdate[];
};

export function ProjectDetailPage({ projectId, activeTab, basePath = '/projects', openTaskId }: Props) {
  const query = useQuery({
    queryKey: ['omes-project-detail', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load project details');
      return payload.data as ProjectDetailResponse;
    },
  });

  const tab = useMemo(() => {
    const keys = tabs.map((t) => t.key);
    const normalizedTab = activeTab === 'tasks' ? 'work' : activeTab;
    return keys.includes(normalizedTab as (typeof tabs)[number]['key']) ? normalizedTab : 'overview';
  }, [activeTab]);

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading project detail...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  const detail = query.data;
  const project = detail.project;
  const progress = Math.min(100, Math.round((project.ev / Math.max(project.bacBudget, 1)) * 100));

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <ToastContainer />
      <div className="flex items-center gap-2 mb-3">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-base font-semibold text-gray-900">{project.projectName}</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{project.projectCode}</span>
        <StatusPill value={project.overallHealth} />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
          <Link
            key={item.key}
            href={`${basePath}/${projectId}?tab=${item.key}`}
            className={`px-2.5 py-1.5 rounded-md text-xs border whitespace-nowrap inline-flex items-center gap-1.5 ${
              tab === item.key ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab projectId={projectId} detail={detail} progress={progress} />}
      {tab === 'work' && <TasksTab projectId={projectId} openTaskId={openTaskId} />}

      {tab === 'milestone' && (
        <MilestoneTab projectId={projectId} />
      )}

      {tab === 'requirement' && <RequirementTab projectId={projectId} />}
      {tab === 'ticket' && <TicketTab projectId={projectId} />}
      {tab === 'documents' && <DocumentsTab projectId={projectId} />}
      {tab === 'members' && <MembersTab projectId={projectId} />}
      {tab === 'activity' && <ActivityTab projectId={projectId} dailyUpdates={detail.dailyUpdates} />}
    </div>
  );
}

// ── Shared icon helpers ────────────────────────────────────────────────────────
function PencilIcon() { return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>; }
function TrashIcon() { return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>; }
function XIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function PlusIcon() { return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>; }

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab({ projectId, detail, progress }: { projectId: string; detail: ProjectDetailResponse; progress: number }) {
  const project = detail.project;

  const taskSummaryQuery = useQuery({
    queryKey: ['omes-task-summary', projectId],
    staleTime: 0,
    queryFn: async () => {
      // WorkBase là nơi user thực sự cập nhật trạng thái task — đọc từ đó để đồng bộ
      const wbRes = await fetch(`/api/omes/workbase?projectId=${projectId}`);
      const wbPayload = await wbRes.json();
      const tableId = wbPayload?.data?.tables?.tasks?.id;
      if (!tableId) {
        // Fallback sang OMES tasks nếu chưa có WorkBase
        const res = await fetch(`/api/projects/${projectId}/tasks`);
        const payload = await res.json();
        const tasks: OmesTask[] = payload.data ?? [];
        return {
          total: tasks.length,
          done: tasks.filter((t) => t.status === 'Done').length,
          overdue: tasks.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length,
        };
      }
      const tblRes = await fetch(`/api/tables/${tableId}?limit=500`);
      const tblPayload = await tblRes.json();
      const fields: { id: string; name: string }[] = tblPayload?.data?.fields ?? [];
      const records: { cells: Record<string, unknown> }[] = tblPayload?.data?.records ?? [];
      const statusField = fields.find((f) => f.name === 'Trạng thái');
      const dueDateField = fields.find((f) => f.name === 'Ngày kết thúc');
      const total = records.length;
      const done = statusField ? records.filter((r) => r.cells[statusField.id] === 'done').length : 0;
      const overdue = records.filter((r) => {
        const status = statusField ? (r.cells[statusField.id] as string) : '';
        if (status === 'done' || status === 'cancelled') return false;
        const due = dueDateField ? (r.cells[dueDateField.id] as string | undefined) : undefined;
        return due ? new Date(due) < new Date() : false;
      }).length;
      return { total, done, overdue };
    },
  });

  // Live ticket data (stays in sync after TicketTab mutations)
  const ticketQuery = useQuery({
    queryKey: ['omes-tickets', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tickets`);
      const payload = await res.json();
      return payload.data as Issue[];
    },
  });

  // Live activity log (includes requirement/doc/ticket CRUD events)
  const activityQuery = useQuery({
    queryKey: ['omes-activity', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      const payload = await res.json();
      return payload.data as ActivityLog[];
    },
  });

  // Requirement and document counts for Overview metrics
  const reqQuery = useQuery({
    queryKey: ['omes-requirements', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/requirements`);
      const payload = await res.json();
      return payload.data as Requirement[];
    },
  });
  const docQuery = useQuery({
    queryKey: ['omes-documents', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      const payload = await res.json();
      return payload.data as ProjectDocument[];
    },
  });

  const milestoneQuery = useQuery({
    queryKey: ['omes-milestones', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const payload = await res.json();
      return payload.data as ProjectMilestone[];
    },
  });

  const tickets = ticketQuery.data ?? detail.issues;
  const reqCount = reqQuery.data?.length ?? 0;
  const _approvedReqCount = reqQuery.data?.filter((r) => r.status === 'Approved').length ?? 0;
  const docCount = docQuery.data?.length ?? 0;
  const liveMilestones = milestoneQuery.data ?? detail.timeline.map((m) => ({ ...m, id: m.phase, projectId, delay: false } as unknown as ProjectMilestone));
  const _latestMilestones = liveMilestones.slice(0, 3);
  const doneMilestones = liveMilestones.filter((m) => m.status === 'Done').length;
  const openIssuesList = tickets.filter((i) => !isDoneLikeStatus(i.status));
  const openIssues = openIssuesList.length;
  const overdueIssues = tickets.filter((i) => i.status === 'SLA Breached' || isOverdueDate(i.dueDate, i.status)).length;
  const criticalIssues = openIssuesList.filter((i) => i.severity === 'Critical');
  const _completedModules = detail.modules.filter((m) => m.actualProgress >= 100 || m.status === 'Done').length;
  const overBudget = project.ac > project.bacBudget;
  const taskTotal = taskSummaryQuery.data?.total ?? 0;
  const taskDone = taskSummaryQuery.data?.done ?? 0;
  const overdueTasks = taskSummaryQuery.data?.overdue ?? 0;
  const overdueTotal = overdueIssues + overdueTasks;
  const _delayedMilestones = liveMilestones.filter((m) => m.status !== 'Done' && new Date(m.endDate) < new Date());
  const _endingSoonMilestones = liveMilestones.filter((m) => {
    const ms = new Date(m.endDate).getTime() - new Date().getTime();
    return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
  });
  const _reviewingReqs = (reqQuery.data ?? []).filter((r) => r.status === 'Reviewing');
  const _totalCost = detail.resources.reduce((sum, r) => sum + (r.actualHours || 0) * (r.hourlyRate || 0), 0);

  // Merge API activity log + daily updates, deduplicate, take most recent 5
  const apiActivity = activityQuery.data ?? [];
  const dailyAsActivity = detail.dailyUpdates.map((d) => ({
    id: d.id,
    projectId,
    actor: d.owner,
    action: 'Cập nhật tiến độ',
    module: 'Daily Update',
    entity: d.workDoneToday,
    timestamp: d.date,
    status: d.status,
    notes: d.blockers || d.internalNotes,
  } as ActivityLog));
  const seen = new Set<string>();
  const recentActivity = [...apiActivity, ...dailyAsActivity]
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Alert strips */}
      {overdueTotal > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {overdueTotal} hạng mục trễ hạn (task/ticket) — cần xem xét và điều chỉnh kế hoạch.
        </div>
      )}
      {overBudget && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs text-orange-700 flex items-center gap-2">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Vượt ngân sách — AC: {project.ac.toLocaleString()} / PV: {project.pv.toLocaleString()}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Tiến độ tổng thể</span>
          <span className="text-sm font-semibold text-blue-700">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress >= 75 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-500' : 'bg-orange-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>EV: <span className="font-medium text-gray-700">{project.ev.toLocaleString()}</span></span>
          <span>PV: <span className="font-medium text-gray-700">{project.pv.toLocaleString()}</span></span>
          <span>AC: <span className={`font-medium ${overBudget ? 'text-red-600' : 'text-gray-700'}`}>{project.ac.toLocaleString()}</span></span>
          <span>CPI: <span className={`font-medium ${project.cpi < 1 ? 'text-red-600' : 'text-emerald-600'}`}>{project.cpi.toFixed(2)}</span></span>
          <span>SPI: <span className={`font-medium ${project.spi < 1 ? 'text-red-600' : 'text-emerald-600'}`}>{project.spi.toFixed(2)}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left column: project info + milestones */}
        <div className="col-span-2 space-y-4">
          {/* Project info card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-semibold text-gray-700">Thông tin dự án</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: 'Tên dự án', value: project.projectName },
                { label: 'Mã dự án', value: <span className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 rounded">{project.projectCode}</span> },
                { label: 'Khách hàng', value: project.customer },
                { label: 'Ngành', value: project.industry },
                { label: 'PM / Owner', value: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {project.pmOwner.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase()}
                    </span>
                    {project.pmOwner}
                  </span>
                )},
                { label: 'Trạng thái', value: <StatusPill value={project.status} /> },
                { label: 'Ưu tiên', value: (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${project.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : project.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : project.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{project.priority}</span>
                )},
                { label: 'Ngày bắt đầu', value: project.startDate || '—' },
                { label: 'Deadline', value: project.endDate || '—' },
                { label: 'Ngân sách', value: project.bacBudget.toLocaleString() + ' đ' },
                { label: 'Thành viên', value: `${detail.resources.length} người` },
                { label: 'Ghi chú', value: <span className="text-gray-500 italic">{project.notes || '—'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center px-5 py-2.5 gap-3">
                  <span className="w-36 shrink-0 text-xs text-gray-500">{label}</span>
                  <span className="text-sm text-gray-800 flex-1">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones card */}
          {liveMilestones.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Milestone</h2>
                <span className="text-xs text-gray-400">{doneMilestones}/{liveMilestones.length} hoàn thành</span>
              </div>
              <div className="divide-y divide-gray-50">
                {liveMilestones.slice(0, 5).map((m) => {
                  const isDone = m.status === 'Done';
                  const isLate = !isDone && m.endDate && new Date(m.endDate) < new Date();
                  return (
                    <div key={m.id ?? m.phase} className="flex items-center gap-3 px-5 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : isLate ? 'bg-red-400' : 'bg-blue-400'}`} />
                      <span className="flex-1 text-sm text-gray-800 truncate">{m.phase}</span>
                      <span className="text-xs text-gray-400 shrink-0">{m.endDate ? m.endDate.slice(0, 10) : '—'}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-700' : isLate ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isDone ? 'Xong' : isLate ? 'Trễ' : 'Đang chạy'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open tickets */}
          {openIssuesList.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Ticket đang mở</h2>
                <span className="text-xs text-gray-400">{openIssues} ticket{criticalIssues.length > 0 && <span className="ml-1 text-red-600 font-semibold">· {criticalIssues.length} Critical</span>}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {openIssuesList.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.severity === 'Critical' ? 'bg-red-500' : t.severity === 'High' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                    <span className="flex-1 text-sm text-gray-800 truncate">{t.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">{t.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: stats + activity */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-semibold text-gray-700">Thống kê nhanh</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Công việc', value: `${taskDone}/${taskTotal}`, sub: 'hoàn thành', color: 'text-blue-700' },
                { label: 'Milestone', value: `${doneMilestones}/${liveMilestones.length}`, sub: 'đạt mốc', color: 'text-indigo-700' },
                { label: 'Ticket mở', value: String(openIssues), sub: 'cần xử lý', color: openIssues > 0 ? 'text-orange-600' : 'text-gray-500' },
                { label: 'Trễ hạn', value: String(overdueTotal), sub: 'hạng mục', color: overdueTotal > 0 ? 'text-red-600' : 'text-gray-500' },
                { label: 'Requirement', value: String(reqCount), sub: 'tổng số', color: 'text-purple-700' },
                { label: 'Tài liệu', value: String(docCount), sub: 'files', color: 'text-teal-700' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                  <p className={`text-xl font-bold leading-tight ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-semibold text-gray-700">Hoạt động gần đây</h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="px-5 py-4 text-xs text-gray-400">Chưa có hoạt động.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentActivity.map((e, idx) => (
                  <div key={`${e.id}-${idx}`} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {(e.actor ?? '?').split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{e.actor} — {e.action}</p>
                      <p className="text-[10px] text-gray-400 truncate">{e.entity || e.module}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{e.timestamp.slice(5, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resources */}
          {detail.resources.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-sm font-semibold text-gray-700">Nhân lực ({detail.resources.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {detail.resources.slice(0, 6).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                      {r.person.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                    </span>
                    <span className="flex-1 text-xs text-gray-800 truncate">{r.person}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{r.role}</span>
                  </div>
                ))}
                {detail.resources.length > 6 && (
                  <p className="px-4 py-2 text-[11px] text-gray-400">+{detail.resources.length - 6} người khác</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Requirement Tab ────────────────────────────────────────────────────────────

const REQ_TYPE_COLORS: Record<RequirementType, string> = {
  Business: 'text-purple-700 bg-purple-50 border-purple-200',
  Functional: 'text-blue-700 bg-blue-50 border-blue-200',
  Technical: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  'Non-functional': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Change Request': 'text-orange-700 bg-orange-50 border-orange-200',
};

const REQ_STATUS_COLORS: Record<RequirementStatus, string> = {
  Draft: 'text-gray-600 bg-gray-100 border-gray-200',
  Reviewing: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Approved: 'text-green-700 bg-green-50 border-green-200',
  Rejected: 'text-red-700 bg-red-50 border-red-200',
  'In Progress': 'text-blue-700 bg-blue-50 border-blue-200',
  Done: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const REQ_TYPES: RequirementType[] = ['Business', 'Functional', 'Technical', 'Non-functional', 'Change Request'];
const REQ_STATUSES: RequirementStatus[] = ['Draft', 'Reviewing', 'Approved', 'Rejected', 'In Progress', 'Done'];

function RequirementTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'title' | 'status' | 'priority'>('code');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Requirement | null>(null);
  const [changelogItem, setChangelogItem] = useState<Requirement | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; type: RequirementType; status: RequirementStatus; priority: 'High' | 'Medium' | 'Low'; milestoneId: string | null; version: string; requester: string; analyst: string }>({
    title: '', description: '', type: 'Business', status: 'Draft', priority: 'Medium', milestoneId: null, version: '1.0', requester: '', analyst: '',
  });

  const query = useQuery({
    queryKey: ['omes-requirements', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/requirements`);
      const payload = await res.json();
      return payload.data as Requirement[];
    },
  });

  const milestonesQuery = useQuery({
    queryKey: ['omes-milestones', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const payload = await res.json();
      return payload.data as ProjectMilestone[];
    },
  });
  const milestones = milestonesQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/projects/${projectId}/requirements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-requirements', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Requirement đã được lưu'); setShowModal(false); },
    onError: (e: Error) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reqId: string) => {
      const res = await fetch(`/api/projects/${projectId}/requirements?reqId=${reqId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-requirements', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Requirement đã xóa'); },
    onError: (e: Error) => toastError(e.message),
  });

  const items = query.data ?? [];
  const filtered = items.filter((r) =>
    (!filterType || r.type === filterType) &&
    (!filterStatus || r.status === filterStatus) &&
    (!filterPriority || r.priority === filterPriority) &&
    (!search || r.title.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    if (sortBy === 'priority') return a.priority.localeCompare(b.priority);
    return a.code.localeCompare(b.code);
  });

  const typeOptions: SelectOption[] = [{ value: '', label: 'Tất cả loại' }, ...REQ_TYPES.map((t) => ({ value: t, label: t }))];
  const statusOptions: SelectOption[] = [{ value: '', label: 'Tất cả trạng thái' }, ...REQ_STATUSES.map((s) => ({ value: s, label: s }))];
  const priorityOptions: SelectOption[] = [{ value: '', label: 'Tất cả ưu tiên' }, ...(['High', 'Medium', 'Low'] as const).map((p) => ({ value: p, label: p }))];
  const sortOptions: SelectOption[] = [
    { value: 'code', label: 'Sắp xếp: Mã' },
    { value: 'title', label: 'Sắp xếp: Tên' },
    { value: 'status', label: 'Sắp xếp: Trạng thái' },
    { value: 'priority', label: 'Sắp xếp: Ưu tiên' },
  ];

  function openAdd() {
    setEditItem(null);
    setForm({ title: '', description: '', type: 'Business', status: 'Draft', priority: 'Medium', milestoneId: null, version: '1.0', requester: '', analyst: '' });
    setShowModal(true);
  }
  function openEdit(r: Requirement) {
    setEditItem(r);
    setForm({ title: r.title, description: r.description, type: r.type, status: r.status, priority: r.priority, milestoneId: r.milestoneId ?? null, version: r.version ?? '1.0', requester: r.requester ?? '', analyst: r.analyst ?? '' });
    setShowModal(true);
  }
  function handleApprove(r: Requirement) { saveMutation.mutate({ ...r, status: 'Approved' }); }
  function handleReject(r: Requirement) { saveMutation.mutate({ ...r, status: 'Rejected' }); }
  function handleSubmitReview(r: Requirement) { saveMutation.mutate({ ...r, status: 'Reviewing' }); }
  async function handleDelete(r: Requirement) {
    const ok = await confirm(`Xóa requirement "${r.title}"?`);
    if (ok) deleteMutation.mutate(r.id);
  }
  function handleSave() {
    if (!form.title) return;
    if (editItem) {
      const versionChanged = editItem.version !== form.version;
      const changeLog: ChangeLogEntry[] = versionChanged
        ? [...(editItem.changeLog ?? []), { version: form.version, date: new Date().toISOString().slice(0, 10), by: 'PM', summary: `Cập nhật version ${form.version}` }]
        : (editItem.changeLog ?? []);
      saveMutation.mutate({ ...editItem, ...form, changeLog });
      return;
    }
    saveMutation.mutate({ ...form, createdBy: 'PM', changeLog: [] });
  }

  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Đang tải...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div>
      {ConfirmDialog}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Requirement</h2>
        <p className="text-xs text-gray-500 mt-1">Quản lý yêu cầu, duyệt yêu cầu và truy vết liên kết đến milestone/ticket.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc mã..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
          <SearchableSelect value={filterType} onChange={setFilterType} options={typeOptions} placeholder="Tất cả loại" />
          <SearchableSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} placeholder="Tất cả trạng thái" />
          <SearchableSelect value={filterPriority} onChange={setFilterPriority} options={priorityOptions} placeholder="Tất cả ưu tiên" />
          <SearchableSelect value={sortBy} onChange={(v) => setSortBy(v as 'code' | 'title' | 'status' | 'priority')} options={sortOptions} placeholder="Sắp xếp" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadCSV(`requirements-${projectId}.csv`, ['Mã', 'Tên', 'Loại', 'Trạng thái', 'Ưu tiên', 'Version', 'Milestone', 'Người tạo'], filtered.map((r) => [r.code, r.title, r.type, r.status, r.priority, r.version ?? '1.0', milestones.find((m) => m.id === r.milestoneId)?.phase ?? '', r.createdBy]))} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs hover:bg-gray-50">CSV</button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><PlusIcon /> Thêm Requirement</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Chưa có requirement nào</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn &quot;Thêm Requirement&quot; để bắt đầu</p>
        </div>
      ) : (() => {
          const reqCols: ColDef<Requirement>[] = [
            { key: 'code', header: 'Mã', defaultWidth: 96, minWidth: 60, sortable: true, sortValue: (r) => r.code, render: (r) => <span className="font-mono text-gray-400">{r.code}</span> },
            { key: 'title', header: 'Tên requirement', defaultWidth: 220, sortable: true, sortValue: (r) => r.title, render: (r) => (<div><p className="font-medium text-gray-800">{r.title}</p>{r.milestoneId && <p className="text-[11px] text-blue-600 mt-0.5">Milestone: {milestones.find((m) => m.id === r.milestoneId)?.phase ?? r.milestoneId}</p>}</div>) },
            { key: 'type', header: 'Loại', defaultWidth: 144, sortable: true, sortValue: (r) => r.type, render: (r) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${REQ_TYPE_COLORS[r.type]}`}>{r.type}</span> },
            { key: 'status', header: 'Trạng thái', defaultWidth: 128, sortable: true, sortValue: (r) => r.status, render: (r) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${REQ_STATUS_COLORS[r.status]}`}>{r.status}</span> },
            { key: 'priority', header: 'Ưu tiên', defaultWidth: 80, sortable: true, sortValue: (r) => r.priority, render: (r) => <span className="text-gray-600">{r.priority}</span> },
            { key: 'version', header: 'Ver.', defaultWidth: 64, sortable: true, sortValue: (r) => r.version ?? '1.0', render: (r) => <span className="text-gray-400 font-mono text-[11px]">{r.version ?? '1.0'}</span> },
            { key: 'requester', header: 'Requester', defaultWidth: 96, sortable: true, sortValue: (r) => r.requester ?? r.createdBy, render: (r) => <span className="text-gray-500">{r.requester ?? r.createdBy}</span> },
            { key: 'analyst', header: 'Analyst', defaultWidth: 96, sortable: true, sortValue: (r) => r.analyst ?? '', render: (r) => <span className="text-gray-500">{r.analyst || '-'}</span> },
            { key: 'actions', header: 'Hành động', defaultWidth: 160, noDrag: true, align: 'right', render: (r) => (<div className="flex items-center justify-end gap-1">{r.status === 'Draft' && <button onClick={() => handleSubmitReview(r)} className="px-2 py-1 text-[11px] rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100">Gửi duyệt</button>}{r.status === 'Reviewing' && (<><button onClick={() => handleApprove(r)} className="px-2 py-1 text-[11px] rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Duyệt</button><button onClick={() => handleReject(r)} className="px-2 py-1 text-[11px] rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Từ chối</button></>)}{(r.changeLog?.length ?? 0) > 0 && <button onClick={() => setChangelogItem(r)} className="px-2 py-1 text-[11px] rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">Log</button>}<button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><PencilIcon /></button><button onClick={() => handleDelete(r)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"><TrashIcon /></button></div>) },
          ];
          return <SmartTable columns={reqCols} rows={sorted} rowKey={(r) => r.id} />;
        })()
      }

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{editItem ? 'Chỉnh sửa Requirement' : 'Thêm Requirement mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tên <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nhập tên requirement..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" placeholder="Mô tả chi tiết..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                  <SearchableSelect value={form.type} onChange={(v) => setForm({ ...form, type: v as RequirementType })} options={REQ_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Chọn loại" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
                  <SearchableSelect value={form.status} onChange={(v) => setForm({ ...form, status: v as RequirementStatus })} options={REQ_STATUSES.map((s) => ({ value: s, label: s }))} placeholder="Chọn trạng thái" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ưu tiên</label>
                  <SearchableSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v as 'High' | 'Medium' | 'Low' })} options={(['High', 'Medium', 'Low'] as const).map((p) => ({ value: p, label: p }))} placeholder="Chọn ưu tiên" className="w-full" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Milestone liên kết</label>
                  <SearchableSelect value={form.milestoneId ?? ''} onChange={(v) => setForm({ ...form, milestoneId: v || null })} options={[{ value: '', label: '-- Không liên kết --' }, ...milestones.map((m) => ({ value: m.id, label: m.phase }))]} placeholder="-- Không liên kết --" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Version</label>
                  <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="1.0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Người yêu cầu</label>
                  <input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên requester..." /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Người phân tích</label>
                  <input value={form.analyst} onChange={(e) => setForm({ ...form, analyst: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên analyst..." /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="px-4 py-2 text-sm text-white rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-60">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {changelogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setChangelogItem(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Changelog - {changelogItem.code}</h2>
              <button onClick={() => setChangelogItem(null)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            {(changelogItem.changeLog?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">Chưa có lịch sử thay đổi</p>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-500">Version</th>
                      <th className="text-left px-3 py-2 text-gray-500">Ngày</th>
                      <th className="text-left px-3 py-2 text-gray-500">Người</th>
                      <th className="text-left px-3 py-2 text-gray-500">Mô tả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changelogItem.changeLog.map((c, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-none">
                        <td className="px-3 py-2 font-mono text-gray-700">{c.version}</td>
                        <td className="px-3 py-2 text-gray-500">{c.date}</td>
                        <td className="px-3 py-2 text-gray-500">{c.by}</td>
                        <td className="px-3 py-2 text-gray-700">{c.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ticket Tab ─────────────────────────────────────────────────────────────────

function TicketTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'severity' | 'stage' | 'dueDate'>('code');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Issue | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [chatAuthor, _setChatAuthor] = useState('PM');
  const [chatContent, setChatContent] = useState('');
  const [form, setForm] = useState<{ reporter: string; description: string; issueType: Issue['issueType']; severity: Issue['severity']; priority: Issue['priority']; owner: string; dueDate: string; rootCause: string; countermeasure: string; resolution: string; milestoneId: string | null; linkedReqId: string | null; stepsToReproduce: string; expectedResult: string; actualResult: string }>({ reporter: '', description: '', issueType: 'Bug', severity: 'Medium', priority: 'P3', owner: '', dueDate: '', rootCause: '', countermeasure: '', resolution: '', milestoneId: null, linkedReqId: null, stepsToReproduce: '', expectedResult: '', actualResult: '' });

  const severities: Issue['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
  const issueTypes: Issue['issueType'][] = ['Bug', 'Issue', 'Support', 'Question', 'Risk-related', 'Requirement Change', 'Data Issue', 'Integration Issue', 'Resource Issue', 'Customer Dependency', 'Production Blocking Issue'];
  const stageOrder = ['Create', 'Receive', 'Process', 'Close'] as const;

  function mapStatusToStage(status: Issue['status']) {
    if (status === 'Closed' || status === 'Resolved' || status === 'Done') return 'Close';
    if (status === 'In Progress') return 'Receive';
    if (status === 'Doing' || status === 'SLA Breached' || status === 'Reopened') return 'Process';
    return 'Create';
  }

  const query = useQuery({
    queryKey: ['omes-tickets', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tickets`);
      const payload = await res.json();
      return payload.data as Issue[];
    },
  });

  const milestonesQuery = useQuery({
    queryKey: ['omes-milestones', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const payload = await res.json();
      return payload.data as ProjectMilestone[];
    },
  });
  const requirementsQuery = useQuery({
    queryKey: ['omes-requirements', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/requirements`);
      const payload = await res.json();
      return payload.data as Requirement[];
    },
  });
  const milestones = milestonesQuery.data ?? [];
  const requirements = requirementsQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/projects/${projectId}/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Save failed'); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-tickets', projectId] }); qc.invalidateQueries({ queryKey: ['omes-project-detail', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Ticket đã được lưu'); setShowModal(false); },
    onError: (e: Error) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/projects/${projectId}/tickets?ticketId=${ticketId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-tickets', projectId] }); qc.invalidateQueries({ queryKey: ['omes-project-detail', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Ticket đã xóa'); },
    onError: (e: Error) => toastError(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ticket, author, content }: { ticket: Issue; author: string; content: string }) => {
      const comments = [
        ...(ticket.comments ?? []),
        { id: crypto.randomUUID(), author, content, createdAt: new Date().toISOString() },
      ];
      const res = await fetch(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticket, comments }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Send failed' }));
        throw new Error(e.error ?? 'Send failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['omes-tickets', projectId] });
      qc.invalidateQueries({ queryKey: ['omes-activity', projectId] });
      setChatContent('');
      toastSuccess('Da gui trao doi');
    },
    onError: (e: Error) => toastError(e.message),
  });

  const items = query.data ?? [];

  const assignees = Array.from(new Set(items.map((x) => x.owner).filter(Boolean)));
  const filtered = items.filter((t) =>
    (!filterSeverity || t.severity === filterSeverity) &&
    (!filterStage || mapStatusToStage(t.status) === filterStage) &&
    (!filterType || t.issueType === filterType) &&
    (!filterAssignee || t.owner === filterAssignee) &&
    (!search || t.description.toLowerCase().includes(search.toLowerCase()) || t.issueCode.toLowerCase().includes(search.toLowerCase()))
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'severity') return a.severity.localeCompare(b.severity);
    if (sortBy === 'stage') return stageOrder.indexOf(mapStatusToStage(a.status)) - stageOrder.indexOf(mapStatusToStage(b.status));
    if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
    return a.issueCode.localeCompare(b.issueCode);
  });
  const selectedTicket = sorted.find((ticket) => ticket.id === selectedTicketId) ?? sorted[0] ?? null;

  const typeOptions: SelectOption[] = [{ value: '', label: 'Tất cả loại' }, ...issueTypes.map((s) => ({ value: s, label: s }))];
  const severityOptions: SelectOption[] = [{ value: '', label: 'Tất cả mức độ' }, ...severities.map((s) => ({ value: s, label: s }))];
  const stageOptions: SelectOption[] = [{ value: '', label: 'Tất cả bước' }, ...stageOrder.map((s) => ({ value: s, label: s }))];
  const assigneeOptions: SelectOption[] = [{ value: '', label: 'Tất cả người xử lý' }, ...assignees.map((s) => ({ value: s, label: s }))];
  const sortOptions: SelectOption[] = [
    { value: 'code', label: 'Sắp xếp: Mã' },
    { value: 'severity', label: 'Sắp xếp: Mức độ' },
    { value: 'stage', label: 'Sắp xếp: Bước' },
    { value: 'dueDate', label: 'Sắp xếp: Hạn' },
  ];

  function openAdd() {
    setEditItem(null);
    setForm({ reporter: '', description: '', issueType: 'Bug', severity: 'Medium', priority: 'P3', owner: '', dueDate: '', rootCause: '', countermeasure: '', resolution: '', milestoneId: null, linkedReqId: null, stepsToReproduce: '', expectedResult: '', actualResult: '' });
    setShowModal(true);
  }
  function openEdit(t: Issue) {
    setEditItem(t);
    setForm({ reporter: t.reporter ?? '', description: t.description, issueType: t.issueType, severity: t.severity, priority: t.priority, owner: t.owner, dueDate: t.dueDate, rootCause: t.rootCause, countermeasure: t.countermeasure, resolution: t.resolution, milestoneId: t.milestoneId ?? null, linkedReqId: t.linkedReqId ?? null, stepsToReproduce: t.stepsToReproduce ?? '', expectedResult: t.expectedResult ?? '', actualResult: t.actualResult ?? '' });
    setShowModal(true);
  }

  function updateStatus(ticket: Issue, status: Issue['status']) {
    saveMutation.mutate({ ...ticket, status, resolution: status === 'Closed' ? (ticket.resolution || 'Da xu ly') : ticket.resolution });
  }

  function handleReceive(ticket: Issue) { updateStatus(ticket, 'In Progress'); }
  function handleProcess(ticket: Issue) { updateStatus(ticket, 'Doing'); }
  function handleClose(ticket: Issue) { updateStatus(ticket, 'Closed'); }
  function handleReopen(ticket: Issue) { updateStatus(ticket, 'Reopened'); }

  async function handleDelete(t: Issue) {
    const ok = await confirm(`Xoa ticket "${t.issueCode} - ${t.description.slice(0, 40)}"?`);
    if (ok) deleteMutation.mutate(t.id);
  }

  function handleSendComment() {
    if (!selectedTicket) return;
    if (!chatAuthor.trim() || !chatContent.trim()) {
      toastError('Can nhap nguoi gui va noi dung');
      return;
    }
    if (mapStatusToStage(selectedTicket.status) === 'Close') {
      toastError('Ticket da dong, khong the trao doi them');
      return;
    }
    commentMutation.mutate({ ticket: selectedTicket, author: chatAuthor.trim(), content: chatContent.trim() });
  }

  function handleSave() {
    if (!form.description) return;
    saveMutation.mutate(editItem ? { ...editItem, ...form } : { ...form, reporter: form.reporter || 'Requester', status: 'Open', comments: [], projectId });
  }

  const severityColors: Record<Issue['severity'], string> = { Critical: 'text-red-700 bg-red-50 border-red-300', High: 'text-orange-700 bg-orange-50 border-orange-200', Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200', Low: 'text-gray-600 bg-gray-100 border-gray-200' };
  const statusColors: Record<Issue['status'], string> = {
    Open: 'text-blue-700 bg-blue-50 border-blue-200',
    'In Progress': 'text-indigo-700 bg-indigo-50 border-indigo-200',
    Doing: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    Resolved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Closed: 'text-green-700 bg-green-50 border-green-200',
    Done: 'text-green-700 bg-green-50 border-green-200',
    Reopened: 'text-purple-700 bg-purple-50 border-purple-200',
    'SLA Breached': 'text-red-700 bg-red-50 border-red-300',
  };

  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [selectedTicket?.comments?.length]);
  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Đang tải...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  const priorityLabel = { P1: 'Khẩn cấp', P2: 'Cao', P3: 'Trung bình', P4: 'Thấp' } as Record<Issue['priority'], string>;
  const priorityColors = { P1: 'text-red-700 bg-red-50 border-red-300', P2: 'text-orange-700 bg-orange-50 border-orange-200', P3: 'text-yellow-700 bg-yellow-50 border-yellow-200', P4: 'text-gray-500 bg-gray-50 border-gray-200' } as Record<Issue['priority'], string>;
  const typeColors: Record<string, string> = { Bug: 'text-red-700 bg-red-50 border-red-300', Issue: 'text-orange-700 bg-orange-50 border-orange-200', Support: 'text-blue-700 bg-blue-50 border-blue-200', Question: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
  const isClosed = selectedTicket ? mapStatusToStage(selectedTicket.status) === 'Close' : false;

  if (selectedTicketId !== null && selectedTicket) {
    return (
      <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px]">
        {ConfirmDialog}
        {/* Left sidebar */}
        <div className="w-72 shrink-0 rounded-l-xl border border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-5 flex-1">
            <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 mb-4 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Danh sách Tickets
            </button>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${typeColors[selectedTicket.issueType] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>{selectedTicket.issueType}</span>
            <h2 className="text-sm font-semibold text-gray-900 mt-2 leading-snug">{selectedTicket.description}</h2>
            <p className="text-xs text-gray-400 mt-1 font-mono">{selectedTicket.issueCode}</p>

            <div className="mt-5 space-y-4 divide-y divide-gray-100">
              <div className="pb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</p>
                <SearchableSelect value={selectedTicket.status} onChange={(v) => updateStatus(selectedTicket, v as Issue['status'])} options={[
                  { value: 'Open', label: 'Mở' },
                  { value: 'In Progress', label: 'Đang tiếp nhận' },
                  { value: 'Doing', label: 'Đang xử lý' },
                  { value: 'Resolved', label: 'Đã giải quyết' },
                  { value: 'Closed', label: 'Đã đóng' },
                  { value: 'Reopened', label: 'Mở lại' },
                  { value: 'SLA Breached', label: 'Quá SLA' },
                ]} placeholder="Chọn trạng thái" className="w-full" />
              </div>
              <div className="pt-4 pb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ưu tiên</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${priorityColors[selectedTicket.priority]}`}>{priorityLabel[selectedTicket.priority]}</span>
              </div>
              <div className="pt-4 pb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Mức độ</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${severityColors[selectedTicket.severity]}`}>{selectedTicket.severity}</span>
              </div>
              {selectedTicket.reporter && (
                <div className="pt-4 pb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Người gửi</p>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{selectedTicket.reporter[0].toUpperCase()}</span>
                    <p className="text-xs text-gray-700 truncate">{selectedTicket.reporter}</p>
                  </div>
                </div>
              )}
              <div className="pt-4 pb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Được giao</p>
                <p className="text-xs text-gray-500">{selectedTicket.owner || '—'}</p>
              </div>
              {selectedTicket.createdDate && (
                <div className="pt-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ngày tạo</p>
                  <p className="text-xs text-gray-500">{new Date(selectedTicket.createdDate).toLocaleDateString('vi-VN')}</p>
                </div>
              )}
            </div>
          </div>
          {/* Workflow actions */}
          <div className="p-4 border-t border-gray-100 flex flex-wrap gap-1.5">
            {mapStatusToStage(selectedTicket.status) === 'Create' && <button onClick={() => handleReceive(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Tiếp nhận</button>}
            {(mapStatusToStage(selectedTicket.status) === 'Create' || mapStatusToStage(selectedTicket.status) === 'Receive') && <button onClick={() => handleProcess(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Xử lý</button>}
            {!isClosed && <button onClick={() => handleClose(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Đóng</button>}
            {isClosed && <button onClick={() => handleReopen(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Mở lại</button>}
            <button onClick={() => openEdit(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">Chỉnh sửa</button>
          </div>
        </div>

        {/* Right chat panel */}
        <div className="flex-1 border-t border-r border-b border-gray-200 rounded-r-xl bg-white flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">
              Hội thoại{' '}
              {(selectedTicket.comments ?? []).length > 0 && (
                <span className="text-gray-400 font-normal ml-1">{(selectedTicket.comments ?? []).length}</span>
              )}
            </h3>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {(selectedTicket.comments ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="h-10 w-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p className="text-sm text-gray-400">Chưa có hội thoại nào</p>
                <p className="text-xs text-gray-300 mt-1">Gửi tin nhắn đầu tiên bên dưới</p>
              </div>
            ) : (
              (selectedTicket.comments ?? []).map((comment) => {
                const initials = comment.author ? comment.author.trim().split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() : '?';
                const dt = (() => { try { const d = new Date(comment.createdAt); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`; } catch { return comment.createdAt.slice(0,16); } })();
                return (
                  <div key={comment.id} className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{comment.author} · {dt}</span>
                      <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{initials}</span>
                    </div>
                    <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-blue-600 text-white text-sm px-4 py-2 leading-relaxed">{comment.content}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4 shrink-0">
            <div className="rounded-xl border border-gray-200 bg-white px-4 pt-3 pb-2 focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-300 transition-all">
              <textarea
                value={chatContent}
                onChange={(e) => setChatContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder={isClosed ? 'Ticket đã đóng, không thể trao đổi thêm' : 'Nhập nội dung... (Enter để gửi, Shift+Enter xuống dòng)'}
                disabled={isClosed}
                rows={2}
                className="w-full text-sm resize-none border-0 focus:outline-none disabled:bg-transparent disabled:text-gray-400 placeholder:text-gray-400"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-gray-300">Enter để gửi · Shift+Enter xuống dòng</span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-gray-300 hover:text-gray-500 rounded transition-colors" title="Đính kèm ảnh">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <button
                    onClick={handleSendComment}
                    disabled={commentMutation.isPending || isClosed || !chatContent.trim()}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div>
      {ConfirmDialog}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Ticket</h2>
        <p className="text-xs text-gray-500 mt-1">Workflow: Create - Receive - Process - Close, kèm trao đổi giữa người gửi và người xử lý cho tới khi đóng ticket.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mô tả hoặc mã..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
          <SearchableSelect value={filterType} onChange={setFilterType} options={typeOptions} placeholder="Tất cả loại" />
          <SearchableSelect value={filterSeverity} onChange={setFilterSeverity} options={severityOptions} placeholder="Tất cả mức độ" />
          <SearchableSelect value={filterStage} onChange={setFilterStage} options={stageOptions} placeholder="Tất cả bước" />
          <SearchableSelect value={filterAssignee} onChange={setFilterAssignee} options={assigneeOptions} placeholder="Tất cả người xử lý" />
          <SearchableSelect value={sortBy} onChange={(v) => setSortBy(v as 'code' | 'severity' | 'stage' | 'dueDate')} options={sortOptions} placeholder="Sắp xếp" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(`tickets-${projectId}.csv`, ['Mã', 'Mô tả', 'Loại', 'Mức độ', 'Trạng thái', 'Owner', 'Milestone', 'Requirement'], filtered.map((t) => [t.issueCode, t.description, t.issueType, t.severity, t.status, t.owner || '', milestones.find((m) => m.id === t.milestoneId)?.phase ?? '', requirements.find((r) => r.id === t.linkedReqId)?.code ?? '']))} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs hover:bg-gray-50">CSV</button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><PlusIcon /> Tạo Ticket</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Ticket className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Chưa có ticket nào</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn &quot;Tạo Ticket&quot; để báo cáo vấn đề</p>
        </div>
      ) : (
        <>
        {(() => {
          const ticketCols: ColDef<Issue>[] = [
            { key: 'code', header: 'Mã', defaultWidth: 96, minWidth: 60, sortable: true, sortValue: (t) => t.issueCode, render: (t) => <span className="font-mono text-gray-400">{t.issueCode}</span> },
            { key: 'description', header: 'Mô tả', defaultWidth: 220, sortable: true, sortValue: (t) => t.description, render: (t) => (<div><p className="font-medium text-gray-800 truncate" title={t.description}>{t.description}</p></div>) },
            { key: 'type', header: 'Loại', defaultWidth: 144, sortable: true, sortValue: (t) => t.issueType, render: (t) => <span className="text-gray-500 text-[11px]">{t.issueType}</span> },
            { key: 'severity', header: 'Mức độ', defaultWidth: 96, sortable: true, sortValue: (t) => t.severity, render: (t) => <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${severityColors[t.severity]}`}>{t.severity}</span> },
            { key: 'stage', header: 'Bước', defaultWidth: 96, sortable: true, sortValue: (t) => mapStatusToStage(t.status), render: (t) => <span className="inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium text-indigo-700 bg-indigo-50 border-indigo-200">{mapStatusToStage(t.status)}</span> },
            { key: 'status', header: 'Trạng thái', defaultWidth: 96, sortable: true, sortValue: (t) => t.status, render: (t) => <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusColors[t.status]}`}>{t.status}</span> },
            { key: 'reporter', header: 'Người gửi', defaultWidth: 96, sortable: true, sortValue: (t) => t.reporter ?? '', render: (t) => <span className="text-gray-600">{t.reporter || '-'}</span> },
            { key: 'owner', header: 'Người xử lý', defaultWidth: 112, sortable: true, sortValue: (t) => t.owner ?? '', render: (t) => <span className="text-gray-600">{t.owner || '-'}</span> },
            { key: 'actions', header: 'Hành động', defaultWidth: 260, noDrag: true, align: 'right', render: (t) => (<div className="flex items-center justify-end gap-1"><button onClick={() => setSelectedTicketId(t.id)} className="px-2 py-1 text-[11px] rounded bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100">Trao đổi</button>{mapStatusToStage(t.status) === 'Create' && <button onClick={() => handleReceive(t)} className="px-2 py-1 text-[11px] rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Tiếp nhận</button>}{(mapStatusToStage(t.status) === 'Create' || mapStatusToStage(t.status) === 'Receive') && <button onClick={() => handleProcess(t)} className="px-2 py-1 text-[11px] rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Xử lý</button>}{mapStatusToStage(t.status) !== 'Close' && <button onClick={() => handleClose(t)} className="px-2 py-1 text-[11px] rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Đóng</button>}{mapStatusToStage(t.status) === 'Close' && <button onClick={() => handleReopen(t)} className="px-2 py-1 text-[11px] rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Mở lại</button>}<button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><PencilIcon /></button><button onClick={() => handleDelete(t)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"><TrashIcon /></button></div>) },
          ];
          return <SmartTable columns={ticketCols} rows={sorted} rowKey={(t) => t.id} rowClassName={(t) => isOverdueDate(t.dueDate, t.status) ? 'bg-red-50/40' : ''} />;
        })()}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{editItem ? 'Chỉnh sửa Ticket' : 'Tạo Ticket mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nguoi gui ticket</label>
                <input value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Ten nguoi gui..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mô tả vấn đề <span className="text-red-500">*</span></label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" placeholder="Mô tả vấn đề chi tiết..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Loại</label><SearchableSelect value={form.issueType} onChange={(v) => setForm({ ...form, issueType: v as Issue['issueType'] })} options={issueTypes.map((t) => ({ value: t, label: t }))} placeholder="Chọn loại" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Mức độ</label><SearchableSelect value={form.severity} onChange={(v) => setForm({ ...form, severity: v as Issue['severity'] })} options={severities.map((s) => ({ value: s, label: s }))} placeholder="Chọn mức độ" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ưu tiên</label><SearchableSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v as Issue['priority'] })} options={(['P1', 'P2', 'P3', 'P4'] as const).map((p) => ({ value: p, label: p }))} placeholder="Chọn ưu tiên" className="w-full" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Milestone liên kết</label><SearchableSelect value={form.milestoneId ?? ''} onChange={(v) => setForm({ ...form, milestoneId: v || null })} options={[{ value: '', label: '-- Không liên kết --' }, ...milestones.map((m) => ({ value: m.id, label: m.phase }))]} placeholder="-- Không liên kết --" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Requirement liên kết</label><SearchableSelect value={form.linkedReqId ?? ''} onChange={(v) => setForm({ ...form, linkedReqId: v || null })} options={[{ value: '', label: '-- Không liên kết --' }, ...requirements.map((r) => ({ value: r.id, label: `${r.code} - ${r.title}` }))]} placeholder="-- Không liên kết --" className="w-full" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Người xử lý</label><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên người xử lý..." /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ngày hạn</label><DatePicker value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Nguyên nhân gốc</label><input value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nguyên nhân..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Biện pháp xử lý</label><input value={form.countermeasure} onChange={(e) => setForm({ ...form, countermeasure: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Biện pháp..." /></div>
              {form.issueType === 'Bug' && (
                <>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Steps to reproduce</label><textarea rows={2} value={form.stepsToReproduce} onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Expected result</label><textarea rows={2} value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Actual result</label><textarea rows={2} value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" /></div>
                </>
              )}
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Kết quả xử lý <span className="text-gray-400 font-normal">(điền khi đóng ticket)</span></label><input value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Mô tả kết quả đã xử lý..." /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="px-4 py-2 text-sm text-white rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-60">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Documents Tab ──────────────────────────────────────────────────────────────

const DOC_TYPE_COLORS: Record<DocType, string> = {
  BRD: 'text-purple-700 bg-purple-50 border-purple-200', SRS: 'text-blue-700 bg-blue-50 border-blue-200',
  'API Spec': 'text-cyan-700 bg-cyan-50 border-cyan-200', Design: 'text-pink-700 bg-pink-50 border-pink-200',
  'Meeting Minutes': 'text-gray-600 bg-gray-100 border-gray-200', UAT: 'text-orange-700 bg-orange-50 border-orange-200',
  Deployment: 'text-indigo-700 bg-indigo-50 border-indigo-200', Contract: 'text-red-700 bg-red-50 border-red-200',
  Other: 'text-gray-600 bg-gray-100 border-gray-200',
};
const DOC_TYPES: DocType[] = ['BRD', 'SRS', 'API Spec', 'Design', 'Meeting Minutes', 'UAT', 'Deployment', 'Contract', 'Other'];

function DocumentsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProjectDocument | null>(null);
  const [form, setForm] = useState<{ name: string; type: DocType; version: string; url: string; uploadedBy: string; tags: string; linkedRequirementId: string; linkedMilestoneId: string; linkedTicketId: string }>({ name: '', type: 'Other', version: '1.0', url: '', uploadedBy: '', tags: '', linkedRequirementId: '', linkedMilestoneId: '', linkedTicketId: '' });
  const [urlError, setUrlError] = useState('');

  const query = useQuery({
    queryKey: ['omes-documents', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      const payload = await res.json();
      return payload.data as ProjectDocument[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/projects/${projectId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-documents', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Tài liệu đã được lưu'); setShowModal(false); },
    onError: (e: Error) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/projects/${projectId}/documents?docId=${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-documents', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Tài liệu đã xóa'); },
    onError: (e: Error) => toastError(e.message),
  });

  const items = query.data ?? [];
  const filtered = items.filter((d) =>
    (!filterType || d.type === filterType) &&
    (!search || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() { setEditItem(null); setForm({ name: '', type: 'Other', version: '1.0', url: '', uploadedBy: '', tags: '', linkedRequirementId: '', linkedMilestoneId: '', linkedTicketId: '' }); setUrlError(''); setShowModal(true); }
  function openEdit(d: ProjectDocument) {
    setEditItem(d);
    setForm({
      name: d.name,
      type: d.type,
      version: d.version,
      url: d.url,
      uploadedBy: d.uploadedBy,
      tags: (d.tags ?? []).join(', '),
      linkedRequirementId: d.linkedRequirementId ?? '',
      linkedMilestoneId: d.linkedMilestoneId ?? '',
      linkedTicketId: d.linkedTicketId ?? '',
    });
    setUrlError('');
    setShowModal(true);
  }
  async function handleDelete(d: ProjectDocument) {
    const ok = await confirm(`Xóa tài liệu "${d.name}"?`);
    if (ok) deleteMutation.mutate(d.id);
  }
  function validateUrl(url: string): boolean {
    if (!url || url === '#') return true; // allow placeholder
    try { new URL(url); return true; } catch { return false; }
  }
  function handleSave() {
    if (!form.name) return;
    if (form.url && form.url !== '#' && !validateUrl(form.url)) {
      setUrlError('URL không hợp lệ. Phải bắt đầu bằng https:// hoặc http://');
      return;
    }
    setUrlError('');
    const payload = {
      ...form,
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      linkedRequirementId: form.linkedRequirementId || null,
      linkedMilestoneId: form.linkedMilestoneId || null,
      linkedTicketId: form.linkedTicketId || null,
    };
    saveMutation.mutate(editItem ? { ...editItem, ...payload } : payload);
  }

  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Đang tải...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div>
      {ConfirmDialog}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Tài liệu</h2>
        <p className="text-xs text-gray-500 mt-1">Lưu trữ tài liệu dự án theo version, tags và liên kết requirement/milestone/ticket.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên tài liệu..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
          <SearchableSelect value={filterType} onChange={setFilterType} options={[{ value: '', label: 'Tất cả loại tài liệu' }, ...DOC_TYPES.map((t) => ({ value: t, label: t }))]} placeholder="Tất cả loại tài liệu" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
          <PlusIcon /> Thêm tài liệu
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Chưa có tài liệu nào</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn &quot;Thêm tài liệu&quot; để đính kèm link</p>
        </div>
      ) : (() => {
          const docCols: ColDef<ProjectDocument>[] = [
            { key: 'name', header: 'Tên tài liệu', defaultWidth: 220, sortable: true, sortValue: (d) => d.name, render: (d) => (<a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline" title={d.url}>{d.name}<svg className="h-3 w-3 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>) },
            { key: 'type', header: 'Loại', defaultWidth: 144, sortable: true, sortValue: (d) => d.type, render: (d) => <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${DOC_TYPE_COLORS[d.type]}`}>{d.type}</span> },
            { key: 'version', header: 'Phiên bản', defaultWidth: 80, sortable: true, sortValue: (d) => d.version, render: (d) => <span className="text-gray-500">v{d.version}</span> },
            { key: 'uploadedBy', header: 'Người tạo', defaultWidth: 112, sortable: true, sortValue: (d) => d.uploadedBy, render: (d) => <span className="text-gray-500">{d.uploadedBy}</span> },
            { key: 'tags', header: 'Tags', defaultWidth: 144, render: (d) => <span className="text-gray-500 text-[11px]">{(d.tags ?? []).join(', ') || '-'}</span> },
            { key: 'updatedAt', header: 'Cập nhật', defaultWidth: 112, sortable: true, sortValue: (d) => d.updatedAt, render: (d) => <span className="text-gray-400">{d.updatedAt}</span> },
            { key: 'actions', header: 'Hành động', defaultWidth: 80, noDrag: true, align: 'right', render: (d) => (<div className="flex justify-end gap-1"><button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><PencilIcon /></button><button onClick={() => handleDelete(d)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"><TrashIcon /></button></div>) },
          ];
          return <SmartTable columns={docCols} rows={filtered} rowKey={(d) => d.id} />;
        })()
      }
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{editItem ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tên tài liệu <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên tài liệu..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                  <SearchableSelect value={form.type} onChange={(v) => setForm({ ...form, type: v as DocType })} options={DOC_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Chọn loại" className="w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Phiên bản</label>
                  <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="1.0" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Đường dẫn (URL)</label>
                <input value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); setUrlError(''); }} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${urlError ? 'border-red-400' : 'border-gray-200'}`} placeholder="https://..." />
                {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Người tạo</label>
                <input value={form.uploadedBy} onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên người tạo..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tags (phân tách bằng dấu phẩy)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="brd, uat, api..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Link Requirement</label>
                  <input value={form.linkedRequirementId} onChange={(e) => setForm({ ...form, linkedRequirementId: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="REQ-001" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Link Milestone</label>
                  <input value={form.linkedMilestoneId} onChange={(e) => setForm({ ...form, linkedMilestoneId: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Milestone ID" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Link Ticket</label>
                  <input value={form.linkedTicketId} onChange={(e) => setForm({ ...form, linkedTicketId: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="ISS-123" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="px-4 py-2 text-sm text-white rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-60">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Members Tab ────────────────────────────────────────────────────────────────

function MembersTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const resQuery = useQuery({
    queryKey: ['omes-resources', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/resources`);
      const data = await res.json();
      return (data.data ?? data.resources ?? []) as Resource[];
    },
  });

  const usersQuery = useQuery({
    queryKey: ['omes-users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      const data = await res.json();
      return (data.data ?? []) as { id: string; name: string; email: string; role: string }[];
    },
  });
  const userList = usersQuery.data ?? [];

  const blank = {
    id: '', person: '', email: '', role: '', projectPermission: 'Member' as const, status: 'Active' as const, joinDate: '', allocationType: 'Fixed' as const, fullOrPartTime: 'Full-time' as const,
    startDate: '', endDate: '', availability: 100, skill: '', responsibility: '', backupPerson: '',
    estimatedHours: 0, actualHours: 0, hourlyRate: 0,
  };
  const [form, setForm] = useState<Partial<Resource>>(blank);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const openNew = () => { setForm(blank); setEditing(true); setSaveErr(''); };
  const openEdit = (r: Resource) => { setForm(r); setEditing(true); setSaveErr(''); };
  const closeForm = () => { setEditing(false); setForm(blank); };

  const save = async () => {
    if (!form.person?.trim()) { setSaveErr('Tên thành viên không được trống'); return; }
    setSaving(true); setSaveErr('');
    try {
      const res = await fetch(`/api/projects/${projectId}/resources`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId }),
      });
      if (!res.ok) throw new Error('Lỗi lưu thành viên');
      qc.invalidateQueries({ queryKey: ['omes-resources', projectId] });
      qc.invalidateQueries({ queryKey: ['omes-activity', projectId] });
      closeForm(); toastSuccess(form.id ? 'Cập nhật thành viên thành công' : 'Thêm thành viên thành công');
    } catch { setSaveErr('Lỗi khi lưu, thử lại'); }
    setSaving(false);
  };

  const remove = async (r: Resource) => {
    if (!(await confirm(`Xóa thành viên "${r.person}" khỏi dự án?`))) return;
    await fetch(`/api/projects/${projectId}/resources?resourceId=${r.id}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['omes-resources', projectId] });
    qc.invalidateQueries({ queryKey: ['omes-activity', projectId] });
    toastSuccess('Đã xóa thành viên');
  };

  const resources = resQuery.data ?? [];
  const roles = Array.from(new Set(resources.map((r) => r.role).filter(Boolean)));
  const filteredResources = resources.filter((r) =>
    (!search || r.person.toLowerCase().includes(search.toLowerCase()) || (r.email ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || r.role === roleFilter) &&
    (!statusFilter || (r.status ?? 'Active') === statusFilter)
  );
  const totalEst = filteredResources.reduce((s, r) => s + (r.estimatedHours || 0), 0);
  const totalAct = filteredResources.reduce((s, r) => s + (r.actualHours || 0), 0);
  const totalCost = filteredResources.reduce((s, r) => s + (r.actualHours || 0) * (r.hourlyRate || 0), 0);
  const overAllocated = filteredResources.filter((r) => r.availability > 100);
  const overEffort = filteredResources.filter((r) => (r.actualHours || 0) > (r.estimatedHours || 0));

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Thành viên</h2>
        <p className="text-xs text-gray-500 mt-1">Quản lý vai trò, allocation, giờ công và chi phí nguồn lực dự án.</p>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{filteredResources.length}/{resources.length} thành viên</p>
          {overAllocated.length > 0 && (
            <p className="text-xs text-orange-600 mt-0.5">⚠ {overAllocated.length} thành viên có khả năng &gt;100%</p>
          )}
          {overEffort.length > 0 && (
            <p className="text-xs text-red-600 mt-0.5">⚠ {overEffort.length} thành viên vượt giờ estimate</p>
          )}
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Thêm thành viên
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-52" />
        <SearchableSelect value={roleFilter} onChange={setRoleFilter} options={[{ value: '', label: 'Tất cả vai trò' }, ...roles.map((r) => ({ value: r, label: r }))]} placeholder="Tất cả vai trò" />
        <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} placeholder="Tất cả trạng thái" />
      </div>

      {/* Member Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{form.id ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-3"><label className="block text-xs text-gray-500 mb-1">Thành viên *</label>
                  <SearchableSelect
                    value={form.person ?? ''}
                    onChange={(v) => {
                      const u = userList.find((u) => u.name === v);
                      setForm((f) => ({ ...f, person: v, email: u?.email ?? f.email, role: f.role || u?.role || '' }));
                    }}
                    options={userList.map((u) => ({ value: u.name, label: `${u.name} — ${u.role}` }))}
                    placeholder="Chọn thành viên từ danh sách..."
                    className="w-full"
                  />
                  {form.person && !userList.find((u) => u.name === form.person) && (
                    <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" placeholder="Nhập tên thủ công..." value={form.person} onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))} />
                  )}
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input type="email" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-gray-50" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Tự điền khi chọn user" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Vai trò</label>
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.role ?? ''} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Quyền dự án</label>
                  <SearchableSelect value={form.projectPermission ?? 'Member'} onChange={(v) => setForm((f) => ({ ...f, projectPermission: v as Resource['projectPermission'] }))} options={['Admin', 'Project Manager', 'Member', 'Viewer', 'Stakeholder'].map((p) => ({ value: p, label: p }))} placeholder="Chọn quyền" className="w-full" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
                  <SearchableSelect value={form.status ?? 'Active'} onChange={(v) => setForm((f) => ({ ...f, status: v as Resource['status'] }))} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} placeholder="Chọn trạng thái" className="w-full" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Ngày tham gia</label>
                  <DatePicker value={form.joinDate ?? ''} onChange={(v) => setForm((f) => ({ ...f, joinDate: v }))} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Loại phân bổ</label>
                  <SearchableSelect value={form.allocationType ?? 'Fixed'} onChange={(v) => setForm((f) => ({ ...f, allocationType: v as Resource['allocationType'] }))} options={[{ value: 'Fixed', label: 'Fixed' }, { value: 'Shared', label: 'Shared' }]} placeholder="Loại phân bổ" className="w-full" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Full/Part time</label>
                  <SearchableSelect value={form.fullOrPartTime ?? 'Full-time'} onChange={(v) => setForm((f) => ({ ...f, fullOrPartTime: v as Resource['fullOrPartTime'] }))} options={[{ value: 'Full-time', label: 'Full-time' }, { value: 'Part-time', label: 'Part-time' }]} placeholder="Full/Part time" className="w-full" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Khả năng (%)</label>
                  <input type="number" min={0} max={200} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.availability ?? 100} onChange={(e) => setForm((f) => ({ ...f, availability: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Kỹ năng</label>
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.skill ?? ''} onChange={(e) => setForm((f) => ({ ...f, skill: e.target.value }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Ngày bắt đầu</label>
                  <DatePicker value={form.startDate ?? ''} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Ngày kết thúc</label>
                  <DatePicker value={form.endDate ?? ''} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Backup</label>
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.backupPerson ?? ''} onChange={(e) => setForm((f) => ({ ...f, backupPerson: e.target.value }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Giờ ước tính</label>
                  <input type="number" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.estimatedHours ?? 0} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Giờ thực tế</label>
                  <input type="number" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.actualHours ?? 0} onChange={(e) => setForm((f) => ({ ...f, actualHours: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Đơn giá (USD/h)</label>
                  <input type="number" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.hourlyRate ?? 0} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))} /></div>
                <div className="col-span-2 sm:col-span-3"><label className="block text-xs text-gray-500 mb-1">Trách nhiệm</label>
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" value={form.responsibility ?? ''} onChange={(e) => setForm((f) => ({ ...f, responsibility: e.target.value }))} /></div>
              </div>
              {saveErr && <p className="text-xs text-red-600 mt-3">{saveErr}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="h-4 w-4" />}
                {form.id ? 'Cập nhật' : 'Thêm thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {resQuery.isPending ? (
        <div className="py-10 text-center text-sm text-gray-400">Đang tải...</div>
      ) : resQuery.error ? (
        <div className="py-10 text-center text-sm text-red-600">{resQuery.error.message}</div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Không có thành viên phù hợp bộ lọc</p>
        </div>
      ) : (() => {
          const memberCols: ColDef<Resource>[] = [
            { key: 'person', header: 'Họ tên', defaultWidth: 160, sortable: true, sortValue: (r) => r.person, render: (r) => (<div><div className="font-medium text-gray-800">{r.person}</div></div>) },
            { key: 'role', header: 'Vai trò', defaultWidth: 120, sortable: true, sortValue: (r) => r.role ?? '', render: (r) => <span className="text-gray-600">{r.role}</span> },
            { key: 'allocationType', header: 'Loại', defaultWidth: 96, sortable: true, sortValue: (r) => r.allocationType, render: (r) => <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${r.allocationType === 'Fixed' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-purple-700 bg-purple-50 border-purple-200'}`}>{r.allocationType}</span> },
            { key: 'availability', header: 'Khả năng', defaultWidth: 120, sortable: true, sortValue: (r) => r.availability, render: (r) => (<div className="flex items-center gap-2"><div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.availability > 100 ? 'bg-orange-500' : r.availability >= 80 ? 'bg-green-500' : r.availability >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.availability, 100)}%` }} /></div><span className={r.availability > 100 ? 'text-orange-600 font-semibold' : 'text-gray-600'}>{r.availability}%</span></div>) },
            { key: 'estimatedHours', header: 'Giờ ƯT', defaultWidth: 80, sortable: true, sortValue: (r) => r.estimatedHours ?? 0, render: (r) => <span className="text-gray-600">{r.estimatedHours || 0}h</span> },
            { key: 'actualHours', header: 'Giờ TT', defaultWidth: 80, sortable: true, sortValue: (r) => r.actualHours ?? 0, render: (r) => <span className="text-gray-600">{r.actualHours || 0}h</span> },
            { key: 'cost', header: 'Chi phí (USD)', defaultWidth: 120, sortable: true, sortValue: (r) => (r.actualHours ?? 0) * (r.hourlyRate ?? 0), render: (r) => <span className="text-gray-600">${((r.actualHours || 0) * (r.hourlyRate || 0)).toLocaleString()}</span> },
            { key: 'skill', header: 'Kỹ năng', defaultWidth: 120, sortable: true, sortValue: (r) => r.skill ?? '', render: (r) => <span className="text-gray-500">{r.skill}</span> },
            { key: 'actions', header: '', defaultWidth: 72, noDrag: true, align: 'right', render: (r) => (<div className="flex justify-end gap-2"><button onClick={() => openEdit(r)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button><button onClick={() => remove(r)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>) },
          ];
          return (
            <SmartTable
              columns={memberCols}
              rows={filteredResources}
              rowKey={(r) => r.id}
              footer={<div className="flex gap-6 text-xs text-gray-500"><span>Tổng giờ ƯT: <strong className="text-gray-700">{totalEst}h</strong></span><span>Tổng giờ TT: <strong className="text-gray-700">{totalAct}h</strong></span><span>Tổng chi phí: <strong className="text-blue-700">${totalCost.toLocaleString()}</strong></span></div>}
            />
          );
        })()}
    </div>
  );
}

// ── Activity Tab ───────────────────────────────────────────────────────────────

function ActivityTab({ projectId, dailyUpdates }: { projectId: string; dailyUpdates: DailyUpdate[] }) {
  const [filterOwner, setFilterOwner] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const query = useQuery({
    queryKey: ['omes-activity', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      const payload = await res.json();
      return payload.data as ActivityLog[];
    },
  });


  // Merge daily updates (from existing prop) with activity log from API
  const apiEntries = query.data ?? [];
  const dailyEntries: ActivityLog[] = dailyUpdates.map((d) => ({ id: d.id, projectId, actor: d.owner, action: 'Cập nhật tiến độ hàng ngày', module: 'Daily Update', entity: d.workDoneToday, timestamp: d.date, status: d.status, notes: d.blockers ? `Blockers: ${d.blockers}` : d.internalNotes }));

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const entries = [...apiEntries, ...dailyEntries].filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const owners = Array.from(new Set(entries.map((e) => e.actor))).filter(Boolean);
  const modules = Array.from(new Set(entries.map((e) => e.module))).filter(Boolean);
  const filtered = entries.filter((e) =>
    (!filterOwner || e.actor === filterOwner) &&
    (!filterModule || e.module === filterModule) &&
    (!searchText || e.entity.toLowerCase().includes(searchText.toLowerCase()) || e.action.toLowerCase().includes(searchText.toLowerCase()) || e.actor.toLowerCase().includes(searchText.toLowerCase())) &&
    (!dateFrom || e.timestamp >= dateFrom) &&
    (!dateTo || e.timestamp <= dateTo + 'T23:59:59')
  );

  const dotColor: Record<string, string> = { Done: 'bg-green-500', Doing: 'bg-blue-500', 'In Progress': 'bg-blue-500', Blocked: 'bg-red-500', Open: 'bg-orange-400', 'SLA Breached': 'bg-red-600', Reviewing: 'bg-yellow-500', Approved: 'bg-green-600', Rejected: 'bg-red-500', Draft: 'bg-gray-400' };

  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Đang tải hoạt động...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Hoạt động</h2>
        <p className="text-xs text-gray-500 mt-1">Theo dõi lịch sử thay đổi theo người dùng, module và thời gian.</p>
      </div>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Tìm kiếm..." className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-40" />
        <DatePicker value={dateFrom} onChange={(v) => setDateFrom(v)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <SearchableSelect value={filterOwner} onChange={setFilterOwner} options={[{ value: '', label: 'Tất cả thành viên' }, ...owners.map((o) => ({ value: o, label: o }))]} placeholder="Tất cả thành viên" />
        <SearchableSelect value={filterModule} onChange={setFilterModule} options={[{ value: '', label: 'Tất cả module' }, ...modules.map((m) => ({ value: m, label: m }))]} placeholder="Tất cả module" />
        {(searchText || dateFrom || dateTo || filterOwner || filterModule) && <button onClick={() => { setSearchText(''); setDateFrom(''); setDateTo(''); setFilterOwner(''); setFilterModule(''); }} className="text-xs text-blue-600 hover:underline">Xóa lọc</button>}
        <span className="text-xs text-gray-400">{filtered.length} hoạt động</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Rss className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Không có hoạt động nào</p>
          {(filterOwner || filterModule || searchText || dateFrom || dateTo) && <p className="text-xs text-gray-400 mt-1">Thử bỏ bộ lọc để xem tất cả</p>}
        </div>
      ) : (
        <div className="relative pl-9">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {filtered.map((e, idx) => (
              <div key={`${e.id}-${idx}`} className="relative">
                <div className="absolute -left-5 top-3 z-10">
                  <span className={`flex h-3 w-3 rounded-full ring-2 ring-white ${dotColor[e.status] ?? 'bg-gray-400'}`} />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div><span className="text-xs font-semibold text-gray-800">{e.actor}</span><span className="text-xs text-gray-500 ml-1">{e.action}</span><span className="text-xs text-gray-400 ml-1">· {e.module}</span></div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{e.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate" title={e.entity}>{e.entity}</p>
                  {e.notes && <p className="text-xs text-gray-400 mt-1 italic">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab({ projectId, openTaskId }: { projectId: string; openTaskId?: string }) {
  const qc = useQueryClient();

  // Khi rời tab Công việc, invalidate cache taskSummaryQuery để tab Tổng quan luôn refetch
  useEffect(() => {
    return () => {
      qc.invalidateQueries({ queryKey: ['omes-task-summary', projectId] });
    };
  }, [qc, projectId]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Công việc</h2>
        <p className="text-xs text-gray-500 mt-1">Quản lý task/sub-task, checklist và theo dõi tiến độ theo bảng công việc.</p>
      </div>
      <div className="h-[72vh]">
        <WorkBase projectId={projectId} compact openTaskId={openTaskId} />
      </div>
    </div>
  );
}

// ── Milestone Tab ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bar: string }> = {
  'In Progress':    { label: 'Đang thực hiện', color: 'text-blue-700 bg-blue-50 border-blue-200',  dot: 'bg-blue-500',  bar: 'bg-blue-400 border border-blue-300' },
  'Done':           { label: 'Hoàn thành',     color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500', bar: 'bg-green-400 border border-green-300' },
  'Cancelled':      { label: 'Đã hủy',         color: 'text-red-700 bg-red-50 border-red-200',    dot: 'bg-red-500',   bar: 'bg-red-300 border border-red-200' },
  'Not Started':    { label: 'Chưa bắt đầu',   color: 'text-gray-600 bg-gray-100 border-gray-200', dot: 'bg-gray-400',  bar: 'bg-gray-200 border border-gray-300' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG['Not Started'];
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

function MilestoneListView({
  items,
  onEdit,
  onDelete,
}: {
  items: ProjectMilestone[];
  onEdit: (m: ProjectMilestone) => void;
  onDelete: (m: ProjectMilestone) => void;
}) {
  return (
    <div className="grid gap-3">
      {items.map((m) => {
        const cfg = getStatusCfg(m.status);
        const isDelayed = (m.status !== 'Done') && (new Date(m.endDate) < new Date());

        return (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className={`h-1.5 w-full ${cfg.bar}`} />
            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/70">
              <span className="text-xs text-gray-500 font-mono">{m.id}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onEdit(m)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(m)} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-5 pb-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{m.phase}</h3>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {isDelayed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">⚠ Trễ hạn</span>}
                  {m.completionPct > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">{m.completionPct}% hoàn thành</span>}
                  {m.dependencies && <span className="text-xs text-gray-500">{m.dependencies}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Bắt đầu: {formatDate(m.startDate)}&nbsp;&nbsp;
                  Hạn: {formatDate(m.endDate)}
                  {m.actualDate && <>&nbsp;&nbsp;Thực tế: {formatDate(m.actualDate)}</>}
                  {m.owner && <>&nbsp;&nbsp;Phụ trách: {m.owner}</>}
                </p>
              </div>
              <span className={`mt-1 shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}></span>
                {cfg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneGanttView({ items }: { items: ProjectMilestone[] }) {
  const today = new Date();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <p className="text-sm text-gray-400">Không có milestone để hiển thị Gantt.</p>
      </div>
    );
  }

  // Compute range aligned to week boundaries (Monday)
  const dates = items.flatMap((m) => [new Date(m.startDate), new Date(m.endDate)]);
  const rawMin = new Date(Math.min(...dates.map((d) => d.getTime())));
  const rawMax = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Snap minDate back to nearest Monday, add 2 extra weeks on each side
  const minDate = new Date(rawMin);
  const dayOfWeek = minDate.getDay(); // 0=Sun
  const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  minDate.setDate(minDate.getDate() + diffToMon - 14);

  const maxDate = new Date(rawMax);
  maxDate.setDate(maxDate.getDate() + 14);

  const totalMs = maxDate.getTime() - minDate.getTime();
  const totalWeeks = Math.ceil(totalMs / (7 * 24 * 60 * 60 * 1000));
  // Each week column: fixed 60px wide
  const COL_W = 60;
  const chartWidth = Math.max(700, totalWeeks * COL_W);

  function pct(d: Date) {
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / totalMs) * 100));
  }

  // Build week columns
  const weeks: { label: string; left: number; width: number; monthStart: boolean; monthLabel: string }[] = [];
  const cur = new Date(minDate);
  while (cur < maxDate) {
    const start = new Date(cur);
    cur.setDate(cur.getDate() + 7);
    const end = new Date(Math.min(cur.getTime(), maxDate.getTime()));
    const isMonthStart = start.getDate() <= 7;
    weeks.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      left: pct(start),
      width: pct(end) - pct(start),
      monthStart: isMonthStart,
      monthLabel: isMonthStart
        ? `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`
        : '',
    });
  }

  // Group weeks by month for the top header row
  const monthGroups: { label: string; left: number; width: number }[] = [];
  const mcur = new Date(minDate);
  while (mcur < maxDate) {
    const start = new Date(mcur);
    const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const end = new Date(Math.min(endOfMonth.getTime(), maxDate.getTime()));
    monthGroups.push({
      label: `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`,
      left: pct(start),
      width: pct(end) - pct(start),
    });
    mcur.setMonth(mcur.getMonth() + 1);
    mcur.setDate(1);
  }

  const todayPct = pct(today);
  const showToday = todayPct >= 0 && todayPct <= 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        {/* Two-row header: months on top, weeks below */}
        <div style={{ minWidth: chartWidth + 160 }}>
          {/* Month row */}
          <div className="relative flex border-b border-gray-200">
            <div className="w-40 shrink-0 border-r border-gray-200 bg-gray-50" />
            <div className="flex-1 relative h-7">
              {monthGroups.map((mg) => (
                <div
                  key={mg.label}
                  className="absolute top-0 h-full flex items-center justify-center text-[11px] text-gray-600 font-semibold border-r border-gray-200 bg-gray-50"
                  style={{ left: `${mg.left}%`, width: `${mg.width}%` }}
                >
                  {mg.label}
                </div>
              ))}
            </div>
          </div>
          {/* Week row */}
          <div className="relative flex border-b border-gray-200">
            <div className="w-40 shrink-0 border-r border-gray-200" />
            <div className="flex-1 relative h-7">
              {weeks.map((w, wi) => (
                <div
                  key={wi}
                  className={`absolute top-0 h-full flex items-center justify-center text-[10px] text-gray-400 border-r border-gray-100 ${w.monthStart ? 'border-r border-l border-gray-200' : ''}`}
                  style={{ left: `${w.left}%`, width: `${w.width}%` }}
                >
                  {w.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        {items.map((m) => {
          const cfg = getStatusCfg(m.status);
          const left = pct(new Date(m.startDate));
          const right = pct(new Date(m.endDate));
          const width = Math.max(right - left, 1);

          return (
            <div key={m.id} className="relative flex border-b border-gray-100 last:border-none" style={{ minWidth: chartWidth + 160 }}>
              <div className="w-40 shrink-0 px-4 py-3 text-xs font-semibold text-gray-800 border-r border-gray-200 flex items-center">
                {m.phase}
              </div>
              <div className="flex-1 relative py-3 px-0" style={{ height: 48 }}>
                {/* Week grid lines */}
                {weeks.map((w, wi) => (
                  <div
                    key={wi}
                    className="absolute top-0 bottom-0 border-r border-gray-100 pointer-events-none"
                    style={{ left: `${w.left}%`, width: `${w.width}%` }}
                  />
                ))}
                {/* Today line */}
                {showToday && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-orange-400 z-10"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
                {/* Bar */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center px-2 text-[11px] font-medium text-gray-700 ${cfg.bar}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${formatDate(m.startDate)} → ${formatDate(m.endDate)}`}
                >
                  <span className="truncate">{m.phase}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
        {Object.values(STATUS_CONFIG).map((cfg) => (
          <span key={cfg.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-6 rounded ${cfg.bar}`}></span>
            {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-orange-400 mx-2"></span>
          Hôm nay
        </span>
      </div>
    </div>
  );
}

function MilestoneTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [view, setView] = useState<'list' | 'gantt'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProjectMilestone | null>(null);
  const [form, setForm] = useState({ phase: '', dependencies: '', startDate: '', endDate: '', status: 'Not Started', owner: '', completionPct: 0, actualDate: '' });

  const query = useQuery({
    queryKey: ['omes-milestones', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const payload = await res.json();
      return payload.data as ProjectMilestone[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Save failed'); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-milestones', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Milestone đã được lưu'); setShowModal(false); },
    onError: (e: Error) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch(`/api/projects/${projectId}/milestones?milestoneId=${milestoneId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['omes-milestones', projectId] }); qc.invalidateQueries({ queryKey: ['omes-activity', projectId] }); toastSuccess('Milestone đã xóa'); },
    onError: (e: Error) => toastError(e.message),
  });

  const items = query.data ?? [];
  const owners = Array.from(new Set(items.map((i) => i.owner).filter(Boolean)));
  const filteredItems = items.filter((m) =>
    (!statusFilter || m.status === statusFilter) &&
    (!ownerFilter || m.owner === ownerFilter)
  );

  function openAdd() { setEditItem(null); setForm({ phase: '', dependencies: '', startDate: '', endDate: '', status: 'Not Started', owner: '', completionPct: 0, actualDate: '' }); setShowModal(true); }
  function openEdit(m: ProjectMilestone) { setEditItem(m); setForm({ phase: m.phase, dependencies: m.dependencies, startDate: m.startDate, endDate: m.endDate, status: m.status, owner: m.owner, completionPct: m.completionPct ?? 0, actualDate: m.actualDate ?? '' }); setShowModal(true); }
  async function handleDelete(m: ProjectMilestone) {
    const ok = await confirm(`Xóa milestone "${m.phase}"?`);
    if (ok) deleteMutation.mutate(m.id);
  }
  function handleSave() {
    if (!form.phase || !form.startDate || !form.endDate) return;
    saveMutation.mutate(editItem ? { ...editItem, ...form } : { ...form });
  }

  if (query.isPending) return <div className="p-6 text-sm text-gray-400">Đang tải...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  return (
    <div>
      {ConfirmDialog}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Milestone</h2>
        <p className="text-xs text-gray-500 mt-1">Quản lý mốc quan trọng theo trạng thái, tiến độ và owner.</p>
      </div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              Danh sách
            </button>
            <button onClick={() => setView('gantt')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${view === 'gantt' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
              Gantt
            </button>
          </div>
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} placeholder="Tất cả trạng thái" />
          <SearchableSelect value={ownerFilter} onChange={setOwnerFilter} options={[{ value: '', label: 'Tất cả owner' }, ...owners.map((o) => ({ value: o, label: o }))]} placeholder="Tất cả owner" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
          <PlusIcon /> Thêm Milestone
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Flag className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Không có milestone phù hợp bộ lọc</p>
        </div>
      ) : view === 'list'
        ? <MilestoneListView items={filteredItems} onEdit={openEdit} onDelete={handleDelete} />
        : <MilestoneGanttView items={filteredItems} />
      }

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{editItem ? 'Chỉnh sửa Milestone' : 'Thêm Milestone mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tên Milestone <span className="text-red-500">*</span></label>
                <input value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nhập tên milestone..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả / Phụ thuộc</label>
                <input value={form.dependencies} onChange={(e) => setForm({ ...form, dependencies: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Mô tả milestone..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Người phụ trách</label>
                <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên người phụ trách..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày bắt đầu <span className="text-red-500">*</span></label>
                  <DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hạn hoàn thành <span className="text-red-500">*</span></label>
                  <DatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
                <SearchableSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} placeholder="Chọn trạng thái" className="w-full" />
                  
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hoàn thành (%)</label>
                  <input type="number" min={0} max={100} value={form.completionPct} onChange={(e) => setForm({ ...form, completionPct: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày hoàn thành TT</label>
                  <DatePicker value={form.actualDate} onChange={(v) => setForm({ ...form, actualDate: v })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="px-4 py-2 text-sm text-white rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-60">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function _Metric({ label, value, sub, danger = false }: { label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function _Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function _KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-none">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-gray-800">{v}</span>
    </div>
  );
}

const _LARK_ICONS: Record<string, React.ReactNode> = {
  text: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>,
  status: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>,
  folder: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>,
  user: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  calendar: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  number: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
  flag: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V3l18 9-18 9z" /></svg>,
};

function _LarkRow({ label, icon, children }: { label: string; icon: keyof typeof _LARK_ICONS; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-6 min-h-[44px] hover:bg-gray-50/60 transition-colors">
      <div className="w-48 shrink-0 flex items-center gap-2 text-[13px] text-gray-500 py-2.5">
        {_LARK_ICONS[icon]}
        {label}
      </div>
      <div className="flex-1 flex items-center text-[13px] text-gray-800 py-2.5">
        {children}
      </div>
    </div>
  );
}


