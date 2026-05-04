'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Ticket, TrendingUp, X } from 'lucide-react';
import type { Issue } from '@/lib/omes-types';
import { SearchableSelect } from './ui';
import { toastSuccess, toastError } from './project-detail-page';

// ── Confirm dialog (local) ────────────────────────────────────────────────────
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

type MyTicket = Issue & { projectName: string; projectCode: string };

type TicketSummary = {
  total: number;
  open: number;
  slaBreached: number;
  done: number;
};

type SortField = 'dueDate' | 'priority' | 'status' | 'createdDate';
type SortDirection = 'asc' | 'desc';
type ListMeta = { total: number; page: number; pageSize: number; totalPages: number; sortBy: string; sortDirection: string };

const PAGE_SIZE = 10;

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Open: { label: 'Mở', cls: 'bg-blue-100 text-blue-700' },
  Doing: { label: 'Đang xử lý', cls: 'bg-indigo-100 text-indigo-700' },
  'In Progress': { label: 'Đang xử lý', cls: 'bg-indigo-100 text-indigo-700' },
  Done: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-700' },
  'SLA Breached': { label: 'Vi phạm SLA', cls: 'bg-red-100 text-red-700' },
  Resolved: { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-600' },
  Closed: { label: 'Đóng', cls: 'bg-gray-100 text-gray-500' },
  Reopened: { label: 'Mở lại', cls: 'bg-orange-100 text-orange-700' },
};

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Mở' },
  { value: 'Doing', label: 'Đang xử lý' },
  { value: 'In Progress', label: 'Đang xử lý (In Progress)' },
  { value: 'Done', label: 'Hoàn thành' },
  { value: 'SLA Breached', label: 'Vi phạm SLA' },
  { value: 'Resolved', label: 'Đã giải quyết' },
  { value: 'Closed', label: 'Đóng' },
  { value: 'Reopened', label: 'Mở lại' },
] as const;

const PRIORITY_CLS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-yellow-100 text-yellow-700',
  P4: 'bg-gray-100 text-gray-500',
};

function Pill({ value }: { value: string }) {
  const entry = STATUS_MAP[value] ?? { label: value, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}>{entry.label}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CLS[value] ?? 'bg-gray-100 text-gray-500'}`}>{value}</span>;
}

function Kpi({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
      <Ticket className="w-10 h-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function MyTicketsPage() {
  const qc = useQueryClient();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  // ── Filter / sort / page state ────────────────────────────────────────────
  const [filterProjectId, setFilterProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [slaBreachedOnly, setSlaBreachedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  // ── Detail / action state ─────────────────────────────────────────────────
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MyTicket | null>(null);
  const [newTicketProjectId, setNewTicketProjectId] = useState('');
  const [chatContent, setChatContent] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<{
    reporter: string; description: string; issueType: Issue['issueType'];
    severity: Issue['severity']; priority: Issue['priority']; owner: string;
    dueDate: string; rootCause: string; countermeasure: string; resolution: string;
    stepsToReproduce: string; expectedResult: string; actualResult: string;
  }>({ reporter: '', description: '', issueType: 'Bug', severity: 'Medium', priority: 'P3', owner: '', dueDate: '', rootCause: '', countermeasure: '', resolution: '', stepsToReproduce: '', expectedResult: '', actualResult: '' });

  // ── Queries ───────────────────────────────────────────────────────────────
  const hasTicketsQuery = useQuery<{ data: { hasAccess?: boolean; hasTickets: boolean; ticketCount: number } }>({
    queryKey: ['my-has-tickets'],
    queryFn: () => fetch('/api/work/my/has-tickets').then((r) => r.json()),
    staleTime: 30_000,
  });

  const summaryQuery = useQuery<{ data: { tickets: TicketSummary } }>({
    queryKey: ['my-work-summary-tickets'],
    queryFn: () => fetch('/api/work/my/summary').then((r) => r.json()),
    staleTime: 0,
  });

  const projectsQuery = useQuery<{ data: Array<{ id: string; projectName: string }> }>({
    queryKey: ['omes-project-overview-select'],
    queryFn: () => fetch('/api/projects/overview', { cache: 'no-store' }).then((r) => r.json()),
    staleTime: 60_000,
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterProjectId) p.set('projectId', filterProjectId);
    if (status) p.set('status', status);
    if (priority) p.set('priority', priority);
    if (slaBreachedOnly) p.set('sla', 'breached');
    p.set('sortBy', sortBy);
    p.set('sortDirection', sortDirection);
    p.set('page', String(page));
    p.set('pageSize', String(PAGE_SIZE));
    return p.toString();
  }, [priority, filterProjectId, slaBreachedOnly, status, page, sortBy, sortDirection]);

  const ticketsQuery = useQuery<{ data: MyTicket[]; meta?: ListMeta }>({
    queryKey: ['my-tickets-page', queryString],
    queryFn: () => fetch(`/api/work/my/tickets${queryString ? `?${queryString}` : ''}`).then((r) => r.json()),
    staleTime: 0,
    enabled: hasTicketsQuery.data?.data.hasAccess !== false,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ ticket, body }: { ticket: MyTicket | null; body: object; projectId: string }) => {
      const pid = (ticket?.projectId) ?? (body as { projectId?: string }).projectId ?? '';
      if (!pid) throw new Error('Chưa chọn dự án');
      const res = await fetch(`/api/projects/${pid}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? 'Lưu thất bại'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tickets-page'] });
      qc.invalidateQueries({ queryKey: ['my-work-summary-tickets'] });
      toastSuccess('Ticket đã được lưu');
      setShowModal(false);
    },
    onError: (e: Error) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ ticketId, projectId: pid }: { ticketId: string; projectId: string }) => {
      const res = await fetch(`/api/projects/${pid}/tickets?ticketId=${ticketId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tickets-page'] });
      qc.invalidateQueries({ queryKey: ['my-work-summary-tickets'] });
      toastSuccess('Ticket đã xóa');
      setSelectedTicketId(null);
    },
    onError: (e: Error) => toastError(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ticket, content }: { ticket: MyTicket; content: string }) => {
      const comments = [
        ...(ticket.comments ?? []),
        { id: crypto.randomUUID(), author: 'PM', content, createdAt: new Date().toISOString() },
      ];
      const res = await fetch(`/api/projects/${ticket.projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticket, comments }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? 'Gửi thất bại'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tickets-page'] });
      setChatContent('');
      toastSuccess('Đã gửi trao đổi');
    },
    onError: (e: Error) => toastError(e.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const issueTypes: Issue['issueType'][] = ['Bug', 'Issue', 'Support', 'Question', 'Risk-related', 'Requirement Change', 'Data Issue', 'Integration Issue', 'Resource Issue', 'Customer Dependency', 'Production Blocking Issue'];
  const severities: Issue['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
  const stageOrder = ['Create', 'Receive', 'Process', 'Close'] as const;

  function mapStatusToStage(s: Issue['status']) {
    if (s === 'Closed' || s === 'Resolved' || s === 'Done') return 'Close';
    if (s === 'In Progress') return 'Receive';
    if (s === 'Doing' || s === 'SLA Breached' || s === 'Reopened') return 'Process';
    return 'Create';
  }

  function updateStatus(ticket: MyTicket, newStatus: Issue['status']) {
    saveMutation.mutate({
      ticket,
      projectId: ticket.projectId,
      body: { ...ticket, status: newStatus, resolution: newStatus === 'Closed' ? (ticket.resolution || 'Đã xử lý') : ticket.resolution },
    });
  }

  function openAdd() {
    setEditItem(null);
    setNewTicketProjectId('');
    setForm({ reporter: '', description: '', issueType: 'Bug', severity: 'Medium', priority: 'P3', owner: '', dueDate: '', rootCause: '', countermeasure: '', resolution: '', stepsToReproduce: '', expectedResult: '', actualResult: '' });
    setShowModal(true);
  }

  function openEdit(t: MyTicket) {
    setEditItem(t);
    setForm({ reporter: t.reporter ?? '', description: t.description, issueType: t.issueType, severity: t.severity, priority: t.priority, owner: t.owner, dueDate: t.dueDate, rootCause: t.rootCause, countermeasure: t.countermeasure, resolution: t.resolution, stepsToReproduce: t.stepsToReproduce ?? '', expectedResult: t.expectedResult ?? '', actualResult: t.actualResult ?? '' });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.description.trim()) { toastError('Vui lòng nhập mô tả'); return; }
    const pid = editItem?.projectId ?? newTicketProjectId;
    if (!pid) { toastError('Vui lòng chọn dự án'); return; }
    saveMutation.mutate({
      ticket: editItem,
      projectId: pid,
      body: editItem
        ? { ...editItem, ...form }
        : { ...form, reporter: form.reporter || 'Requester', status: 'Open' as Issue['status'], comments: [], projectId: pid },
    });
  }

  async function handleDelete(t: MyTicket) {
    const ok = await confirm(`Xóa ticket "${t.issueCode} - ${t.description.slice(0, 40)}"?`);
    if (ok) deleteMutation.mutate({ ticketId: t.id, projectId: t.projectId });
  }

  function handleSendComment(ticket: MyTicket) {
    if (!chatContent.trim()) { toastError('Nhập nội dung trao đổi'); return; }
    if (mapStatusToStage(ticket.status) === 'Close') { toastError('Ticket đã đóng, không thể trao đổi thêm'); return; }
    commentMutation.mutate({ ticket, content: chatContent.trim() });
  }

  const resetFilters = () => {
    setFilterProjectId('');
    setStatus('');
    setPriority('');
    setSlaBreachedOnly(false);
    setPage(1);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasAccess = hasTicketsQuery.data?.data.hasAccess ?? true;
  const hasTickets = hasTicketsQuery.data?.data.hasTickets ?? false;
  const summary = summaryQuery.data?.data.tickets;
  const tickets = ticketsQuery.data?.data ?? [];
  const meta = ticketsQuery.data?.meta;
  const projects = projectsQuery.data?.data ?? [];
  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? tickets.length;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;
  const isClosed = selectedTicket ? mapStatusToStage(selectedTicket.status) === 'Close' : false;

  const severityColors: Record<Issue['severity'], string> = { Critical: 'text-red-700 bg-red-50 border-red-300', High: 'text-orange-700 bg-orange-50 border-orange-200', Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200', Low: 'text-gray-600 bg-gray-100 border-gray-200' };
  const statusColors: Record<Issue['status'], string> = { Open: 'text-blue-700 bg-blue-50 border-blue-200', 'In Progress': 'text-indigo-700 bg-indigo-50 border-indigo-200', Doing: 'text-indigo-700 bg-indigo-50 border-indigo-200', Resolved: 'text-emerald-700 bg-emerald-50 border-emerald-200', Closed: 'text-green-700 bg-green-50 border-green-200', Done: 'text-green-700 bg-green-50 border-green-200', Reopened: 'text-purple-700 bg-purple-50 border-purple-200', 'SLA Breached': 'text-red-700 bg-red-50 border-red-300' };
  const priorityLabel: Record<Issue['priority'], string> = { P1: 'Khẩn cấp', P2: 'Cao', P3: 'Trung bình', P4: 'Thấp' };
  const priorityColors: Record<Issue['priority'], string> = { P1: 'text-red-700 bg-red-50 border-red-300', P2: 'text-orange-700 bg-orange-50 border-orange-200', P3: 'text-yellow-700 bg-yellow-50 border-yellow-200', P4: 'text-gray-500 bg-gray-50 border-gray-200' };
  const typeColors: Record<string, string> = { Bug: 'text-red-700 bg-red-50 border-red-300', Issue: 'text-orange-700 bg-orange-50 border-orange-200', Support: 'text-blue-700 bg-blue-50 border-blue-200', Question: 'text-indigo-700 bg-indigo-50 border-indigo-200' };

  // ── Chat scroll ───────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [selectedTicket?.comments?.length]);

  if (hasTicketsQuery.isPending) {
    return <div className="p-6 text-sm text-gray-400">Đang tải...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="h-full bg-gray-50 px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900">Ticket của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Tài khoản của bạn không thuộc nhóm xử lý ticket phần mềm.</p>
          <div className="mt-6">
            <Empty message="Bạn không có quyền truy cập khu vực Ticket." />
          </div>
        </div>
      </div>
    );
  }

  if (!hasTickets) {
    return (
      <div className="h-full bg-gray-50 px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900">Ticket của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Bạn chưa có ticket nào thuộc phạm vi xử lý hiện tại.</p>
          <div className="mt-6">
            <Empty message="Chưa có ticket để theo dõi." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {ConfirmDialog}

      {/* ── Detail view ─────────────────────────────────────────────────────── */}
      {selectedTicketId !== null && selectedTicket && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0 flex items-center justify-between">
            <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Danh sách Tickets
            </button>
            <span className="text-xs font-mono text-gray-400">{selectedTicket.issueCode}</span>
          </div>

          <div className="flex-1 flex gap-0 overflow-hidden px-6 pb-6 pt-4">
            {/* Left metadata panel */}
            <div className="w-72 shrink-0 rounded-l-xl border border-gray-200 bg-white overflow-y-auto flex flex-col">
              <div className="p-5 flex-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${typeColors[selectedTicket.issueType] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>{selectedTicket.issueType}</span>
                <h2 className="text-sm font-semibold text-gray-900 mt-2 leading-snug">{selectedTicket.description}</h2>
                <p className="text-xs text-gray-400 mt-1">{selectedTicket.projectName} · {selectedTicket.projectCode}</p>

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
                  {selectedTicket.dueDate && (
                    <div className="pt-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Hạn chót</p>
                      <p className="text-xs text-gray-500">{selectedTicket.dueDate}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Workflow actions */}
              <div className="p-4 border-t border-gray-100 flex flex-wrap gap-1.5">
                {mapStatusToStage(selectedTicket.status) === 'Create' && <button onClick={() => updateStatus(selectedTicket, 'In Progress')} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Tiếp nhận</button>}
                {(mapStatusToStage(selectedTicket.status) === 'Create' || mapStatusToStage(selectedTicket.status) === 'Receive') && <button onClick={() => updateStatus(selectedTicket, 'Doing')} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Xử lý</button>}
                {!isClosed && <button onClick={() => updateStatus(selectedTicket, 'Closed')} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Đóng</button>}
                {isClosed && <button onClick={() => updateStatus(selectedTicket, 'Reopened')} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Mở lại</button>}
                <button onClick={() => openEdit(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">Chỉnh sửa</button>
                <button onClick={() => handleDelete(selectedTicket)} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Xóa</button>
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

              <div className="border-t border-gray-100 p-4 shrink-0">
                <div className="rounded-xl border border-gray-200 bg-white px-4 pt-3 pb-2 focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-300 transition-all">
                  <textarea
                    value={chatContent}
                    onChange={(e) => setChatContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(selectedTicket); } }}
                    placeholder={isClosed ? 'Ticket đã đóng, không thể trao đổi thêm' : 'Nhập nội dung... (Enter để gửi, Shift+Enter xuống dòng)'}
                    disabled={isClosed}
                    rows={2}
                    className="w-full text-sm resize-none border-0 focus:outline-none disabled:bg-transparent disabled:text-gray-400 placeholder:text-gray-400"
                  />
                  <div className="flex items-center justify-end mt-1">
                    <button
                      onClick={() => handleSendComment(selectedTicket)}
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
      )}

      {/* ── List view ────────────────────────────────────────────────────────── */}
      {selectedTicketId === null && (
        <>
          <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Ticket của tôi</h1>
              <p className="text-xs text-gray-500">Danh sách ticket bạn được giao hoặc tạo trên các dự án phần mềm.</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Tạo Ticket
            </button>
          </div>

          <div className="px-6 pt-4 pb-3 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Tổng ticket" value={summary?.total ?? 0} sub="Tất cả ticket" color="text-indigo-700" />
            <Kpi label="Đang mở" value={summary?.open ?? 0} sub="Cần xử lý" color="text-blue-700" />
            <Kpi label="Vi phạm SLA" value={summary?.slaBreached ?? 0} sub="Ưu tiên cao" color="text-red-700" />
            <Kpi label="Đã giải quyết" value={summary?.done ?? 0} sub="Done / Resolved / Closed" color="text-emerald-700" />
          </div>

          <div className="px-6 pb-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <SearchableSelect
                value={filterProjectId}
                onChange={(v) => { setFilterProjectId(v); setPage(1); }}
                options={[{ value: '', label: 'Tất cả dự án' }, ...projects.map((p) => ({ value: p.id, label: p.projectName }))]}
                placeholder="Tất cả dự án"
              />
              <SearchableSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[{ value: '', label: 'Tất cả trạng thái' }, ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))]}
                placeholder="Tất cả trạng thái"
              />
              <SearchableSelect
                value={priority}
                onChange={(v) => { setPriority(v); setPage(1); }}
                options={[{ value: '', label: 'Tất cả ưu tiên' }, { value: 'P1', label: 'P1' }, { value: 'P2', label: 'P2' }, { value: 'P3', label: 'P3' }, { value: 'P4', label: 'P4' }]}
                placeholder="Tất cả ưu tiên"
              />
              <SearchableSelect
                value={sortBy}
                onChange={(v) => { setSortBy(v as SortField); setPage(1); }}
                options={[{ value: 'dueDate', label: 'Sắp theo hạn chót' }, { value: 'priority', label: 'Sắp theo ưu tiên' }, { value: 'status', label: 'Sắp theo trạng thái' }, { value: 'createdDate', label: 'Sắp theo ngày tạo' }]}
                placeholder="Sắp xếp"
              />
              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
              </button>
              <button
                onClick={() => { setSlaBreachedOnly((v) => !v); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${slaBreachedOnly ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Clock className="w-3.5 h-3.5" />
                Chỉ SLA vi phạm
              </button>
              <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline px-1">Xóa lọc</button>
              <span className="ml-auto text-xs text-gray-400">{totalItems} ticket</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {ticketsQuery.isPending ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                <TrendingUp className="w-4 h-4 mr-2 opacity-50" /> Đang tải...
              </div>
            ) : totalItems === 0 ? (
              <Empty message="Không có ticket nào phù hợp bộ lọc." />
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 font-medium">Mã</th>
                        <th className="text-left px-4 py-2.5 font-medium">Mô tả</th>
                        <th className="text-left px-4 py-2.5 font-medium">Dự án</th>
                        <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                        <th className="text-left px-4 py-2.5 font-medium">Ưu tiên</th>
                        <th className="text-left px-4 py-2.5 font-medium">Hạn chót</th>
                        <th className="px-4 py-2.5 font-medium text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => {
                        const stage = mapStatusToStage(ticket.status);
                        return (
                          <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{ticket.issueCode}</td>
                            <td className="px-4 py-2.5 max-w-xs">
                              <button onClick={() => setSelectedTicketId(ticket.id)} className="text-left text-gray-800 font-medium truncate block w-full hover:text-blue-600" title={ticket.description}>
                                {ticket.description}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{ticket.projectCode || ticket.projectName}</td>
                            <td className="px-4 py-2.5"><Pill value={ticket.status} /></td>
                            <td className="px-4 py-2.5"><PriorityBadge value={ticket.priority} /></td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                              {ticket.dueDate}
                              {ticket.status === 'SLA Breached' && <span className="ml-1 text-[10px] bg-red-100 text-red-600 rounded px-1 py-0.5 font-medium">SLA</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setSelectedTicketId(ticket.id)} className="px-2 py-1 text-[11px] rounded bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100">Trao đổi</button>
                                {stage === 'Create' && <button onClick={() => updateStatus(ticket, 'In Progress')} className="px-2 py-1 text-[11px] rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Tiếp nhận</button>}
                                {(stage === 'Create' || stage === 'Receive') && <button onClick={() => updateStatus(ticket, 'Doing')} className="px-2 py-1 text-[11px] rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Xử lý</button>}
                                {stage !== 'Close' && <button onClick={() => updateStatus(ticket, 'Closed')} className="px-2 py-1 text-[11px] rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Đóng</button>}
                                {stage === 'Close' && <button onClick={() => updateStatus(ticket, 'Reopened')} className="px-2 py-1 text-[11px] rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Mở lại</button>}
                                <button onClick={() => openEdit(ticket)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(ticket)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40">Trước</button>
                    <span className="text-gray-500">Trang {page}/{totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40">Sau</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{editItem ? 'Chỉnh sửa Ticket' : 'Tạo Ticket mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {!editItem && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dự án <span className="text-red-500">*</span></label>
                  <SearchableSelect value={newTicketProjectId} onChange={setNewTicketProjectId} options={[{ value: '', label: '-- Chọn dự án --' }, ...projects.map((p) => ({ value: p.id, label: p.projectName }))]} placeholder="Chọn dự án" className="w-full" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Người gửi ticket</label>
                <input value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên người gửi..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả vấn đề <span className="text-red-500">*</span></label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" placeholder="Mô tả vấn đề chi tiết..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                  <SearchableSelect value={form.issueType} onChange={(v) => setForm({ ...form, issueType: v as Issue['issueType'] })} options={issueTypes.map((t) => ({ value: t, label: t }))} placeholder="Chọn loại" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mức độ</label>
                  <SearchableSelect value={form.severity} onChange={(v) => setForm({ ...form, severity: v as Issue['severity'] })} options={severities.map((s) => ({ value: s, label: s }))} placeholder="Chọn mức độ" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ưu tiên</label>
                  <SearchableSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v as Issue['priority'] })} options={(['P1', 'P2', 'P3', 'P4'] as const).map((p) => ({ value: p, label: p }))} placeholder="Chọn ưu tiên" className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Người xử lý</label>
                  <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tên người xử lý..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày hạn</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nguyên nhân gốc</label>
                <input value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nguyên nhân..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Biện pháp xử lý</label>
                <input value={form.countermeasure} onChange={(e) => setForm({ ...form, countermeasure: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Biện pháp..." />
              </div>
              {form.issueType === 'Bug' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Steps to reproduce</label>
                    <textarea rows={2} value={form.stepsToReproduce} onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Expected result</label>
                    <textarea rows={2} value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Actual result</label>
                    <textarea rows={2} value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kết quả xử lý <span className="text-gray-400 font-normal">(điền khi đóng ticket)</span></label>
                <input value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Mô tả kết quả đã xử lý..." />
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
