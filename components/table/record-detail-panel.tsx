'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CellEditor } from './cell-editor';
import type { CellValue, Field, RecordRow } from '@/lib/types';
import { ChevronLeft, ChevronRight, MessageCircle, Paperclip, Send, X } from 'lucide-react';

// ── Field type icons ──────────────────────────────────────────────────────────
const FIELD_ICONS: Record<string, React.ReactNode> = {
  text:      <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>,
  number:    <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
  select:    <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  checkbox:  <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  date:      <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  multiselect: <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  user:      <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

function fieldIcon(type: string): React.ReactNode {
  return FIELD_ICONS[type] ?? FIELD_ICONS['text'];
}

// ── Cell value display ────────────────────────────────────────────────────────
function CellDisplay({ field, value }: { field: Field; value: CellValue }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  if (field.type === 'checkbox') {
    return (
      <input type="checkbox" readOnly checked={!!value} className="accent-indigo-600 w-4 h-4" />
    );
  }
  if (field.type === 'select' || field.type === 'multiselect') {
    const vals = Array.isArray(value) ? value : [String(value)];
    return (
      <div className="flex flex-wrap gap-1">
        {vals.map((v) => (
          <span key={v} className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">{v}</span>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-gray-800">{String(value)}</span>;
}

// ── Comment type ──────────────────────────────────────────────────────────────
interface RecordComment {
  id: string;
  recordId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachments?: { name: string; url: string; type: string }[];
  mentionUserIds?: string[];
  createdAt: string;
}

interface OmesUserBrief {
  id: string;
  name: string;
  email: string;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, color = 'bg-indigo-500' }: { name: string; color?: string }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();
  return (
    <span className={`w-6 h-6 rounded-full ${color} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </span>
  );
}

// ── Main panel component ──────────────────────────────────────────────────────
export function RecordDetailPanel({
  record,
  fields,
  recordIndex,
  totalRecords,
  tableId,
  onClose,
  onNavigate,
  onCellChange,
  onCellBlur,
}: {
  record: RecordRow;
  fields: Field[];
  recordIndex: number;
  totalRecords: number;
  tableId: string;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
  onCellChange: (recordId: string, fieldId: string, value: CellValue) => void;
  onCellBlur: (recordId: string, fieldId: string) => void;
}) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showComment, setShowComment] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Reset when record changes
  useEffect(() => {
    setEditingFieldId(null);
    setCommentText('');
    setAttachments([]);
    setMentionUserIds([]);
    setMentionQuery(null);
  }, [record.id]);

  // Scroll to bottom when comment panel opens
  useEffect(() => {
    if (showComment) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [showComment]);

  // Title = first text field value
  const primaryField = fields.find((f) => f.is_primary) ?? fields[0];
  const title = primaryField ? String(record.cells[primaryField.id] ?? 'Bản ghi') : 'Bản ghi';

  // ── Users for @ mention ───────────────────────────────────────────────────
  const usersQuery = useQuery<{ data: OmesUserBrief[] }>({
    queryKey: ['users-brief'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    staleTime: 60_000,
    enabled: showComment,
  });
  const allUsers: OmesUserBrief[] = usersQuery.data?.data ?? [];
  const filteredUsers = mentionQuery !== null
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  // ── Comments ──────────────────────────────────────────────────────────────
  const commentsQuery = useQuery<{ data: RecordComment[] }>({
    queryKey: ['record-comments', record.id],
    queryFn: () => fetch(`/api/tables/${tableId}/records/${record.id}/comments`).then((r) => r.json()),
    staleTime: 0,
  });
  const comments = commentsQuery.data?.data ?? [];

  const sendComment = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tables/${tableId}/records/${record.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim(), attachments, mentionUserIds }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['record-comments', record.id] });
      setCommentText('');
      setAttachments([]);
      setMentionUserIds([]);
      setMentionQuery(null);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
  });

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommentText(val);
    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const match = before.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  }, []);

  const handleSelectMention = useCallback((user: OmesUserBrief) => {
    const caret = inputRef.current?.selectionStart ?? commentText.length;
    const before = commentText.slice(0, caret);
    const after = commentText.slice(caret);
    const atIdx = before.lastIndexOf('@');
    setCommentText(before.slice(0, atIdx) + `@${user.name} ` + after);
    setMentionQuery(null);
    if (!mentionUserIds.includes(user.id)) setMentionUserIds((prev) => [...prev, user.id]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [commentText, mentionUserIds]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments((prev) => [...prev, { name: file.name, url: ev.target?.result as string, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const canSend = (commentText.trim().length > 0 || attachments.length > 0) && !sendComment.isPending;

  // ── History ───────────────────────────────────────────────────────────────
  const historyQuery = useQuery<{ data: Array<{ id: string; fieldId: string; fieldName: string; actor: string; oldValue: string; newValue: string; timestamp: string }> }>({
    queryKey: ['record-history', record.id],
    queryFn: () => fetch(`/api/tables/${tableId}/records/${record.id}/history`).then((r) => r.json()),
    enabled: activeTab === 'history',
    staleTime: 0,
  });
  const history = historyQuery.data?.data ?? [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full z-50 flex shadow-2xl" style={{ width: showComment ? 820 : 520 }}>
        {/* Main content */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden border-l border-gray-200">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(-1)}
                disabled={recordIndex <= 0}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Bản ghi trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate(1)}
                disabled={recordIndex >= totalRecords - 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                title="Bản ghi tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 ml-1">{recordIndex + 1} / {totalRecords}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComment((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showComment ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Comment
                {comments.length > 0 && (
                  <span className="min-w-[16px] px-1 text-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {comments.length}
                  </span>
                )}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Record title */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">ID: {record.id.slice(0, 8)}…</p>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 px-2 flex-shrink-0">
            {(['details', 'history'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'details' ? 'Details' : 'History'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'details' && (
              <div className="divide-y divide-gray-100">
                {fields.map((field) => {
                  const isEditing = editingFieldId === field.id;
                  const value = record.cells[field.id] ?? null;
                  return (
                    <div
                      key={field.id}
                      className="flex items-center px-6 min-h-[44px] hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => setEditingFieldId(field.id)}
                    >
                      <div className="w-44 shrink-0 flex items-center gap-2 text-[13px] text-gray-500 py-2.5">
                        {fieldIcon(field.type)}
                        <span className="truncate">{field.name}</span>
                      </div>
                      <div className="flex-1 py-2 min-h-[28px] flex items-center">
                        {isEditing ? (
                          <div className="w-full">
                            <CellEditor
                              field={field}
                              value={value}
                              onChange={(v) => onCellChange(record.id, field.id, v)}
                              onBlur={() => { onCellBlur(record.id, field.id); setEditingFieldId(null); }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <CellDisplay field={field} value={value} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                {historyQuery.isPending ? (
                  <p className="text-xs text-gray-400 px-6 py-8 text-center">Đang tải...</p>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-7 h-7 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs">Chưa có lịch sử thay đổi.</p>
                  </div>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-24">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">User</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Field</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Before</th>
                        <th className="text-center px-2 py-2.5 text-gray-400 w-6">→</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{h.timestamp.slice(0, 10)}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                {(h.actor ?? '?').split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                              </span>
                              <span className="text-gray-700">{h.actor}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{h.fieldName}</td>
                          <td className="px-4 py-2.5">
                            {h.oldValue ? <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{h.oldValue}</span> : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-2 py-2.5 text-center text-gray-300">→</td>
                          <td className="px-4 py-2.5 text-gray-700">{h.newValue || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comment panel */}
        {showComment && (
          <div className="w-[300px] shrink-0 border-l border-gray-200 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">Comments ({comments.length})</span>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-10 text-gray-400">
                  <MessageCircle className="w-6 h-6 mb-2 opacity-30" />
                  <p className="text-xs">No comments yet</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar name={c.authorName} />
                      <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                      <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    {/* Text with @mentions highlighted */}
                    {c.content && (
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {c.content.split(/(@\S+)/g).map((part, i) =>
                          part.startsWith('@')
                            ? <span key={i} className="text-blue-600 font-medium">{part}</span>
                            : part
                        )}
                      </p>
                    )}
                    {/* Attachments */}
                    {c.attachments && c.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.attachments.map((att, i) =>
                          att.type.startsWith('image/') ? (
                            <a key={i} href={att.url} target="_blank" rel="noreferrer" title={att.name}>
                              <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <a key={i} href={att.url} download={att.name} title={att.name}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-[10px] text-gray-700 max-w-[120px]"
                            >
                              <Paperclip className="w-3 h-3 shrink-0 text-gray-400" />
                              <span className="truncate">{att.name}</span>
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group">
                      {att.type.startsWith('image/') ? (
                        <img src={att.url} alt={att.name} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-[10px] text-gray-700 max-w-[100px]" title={att.name}>
                          <Paperclip className="w-3 h-3 shrink-0 text-gray-400" />
                          <span className="truncate">{att.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* @ mention dropdown */}
              {mentionQuery !== null && filteredUsers.length > 0 && (
                <div className="mb-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectMention(u); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                    >
                      <Avatar name={u.name} color="bg-indigo-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Text input row */}
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all bg-white">
                <input
                  ref={inputRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setMentionQuery(null); return; }
                    if (e.key === 'Enter' && !e.shiftKey && canSend) {
                      e.preventDefault();
                      sendComment.mutate();
                    }
                  }}
                  placeholder="Nhập bình luận... (@ để tag)"
                  className="flex-1 outline-none text-xs text-gray-700 bg-transparent min-w-0"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                  title="Đính kèm file / ảnh"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={!canSend}
                  onClick={() => sendComment.mutate()}
                  className="text-blue-500 hover:text-blue-700 disabled:opacity-30 transition-colors flex-shrink-0"
                  title="Gửi"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
