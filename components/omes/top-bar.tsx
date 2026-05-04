'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatformStore } from '@/store/platform-store';

// ── Mock data ──────────────────────────────────────────────────────────────────

const NOTIFICATIONS = [
  {
    id: 1,
    unread: true,
    title: 'Nhiệm vụ mới được giao',
    body: 'Bạn được giao nhiệm vụ "Thiết kế màn hình Dashboard" trong dự án OMES-2024.',
    time: '5 phút trước',
    avatar: 'T',
    avatarColor: 'bg-blue-500',
  },
  {
    id: 2,
    unread: true,
    title: 'Ai đó đã nhắc đến bạn',
    body: '@admin đã đề cập bạn trong bình luận của Ticket #TK-042.',
    time: '22 phút trước',
    avatar: 'N',
    avatarColor: 'bg-purple-500',
  },
  {
    id: 3,
    unread: true,
    title: 'Cảnh báo rủi ro mới',
    body: 'Rủi ro "Delay tích hợp API bên thứ 3" vừa được thêm vào dự án ERP-Core.',
    time: '1 giờ trước',
    avatar: '!',
    avatarColor: 'bg-red-500',
  },
  {
    id: 4,
    unread: false,
    title: 'Milestone hoàn thành',
    body: 'Milestone "Phase 1 – Phân tích yêu cầu" đã được đánh dấu hoàn thành.',
    time: '3 giờ trước',
    avatar: '✓',
    avatarColor: 'bg-teal-500',
  },
  {
    id: 5,
    unread: false,
    title: 'SLA sắp vi phạm',
    body: 'Ticket #TK-038 còn 2 giờ trước khi vi phạm SLA. Vui lòng xử lý ngay.',
    time: 'Hôm qua',
    avatar: '⏰',
    avatarColor: 'bg-orange-500',
  },
];

type Message = {
  id: number;
  from: 'me' | 'them';
  text?: string;
  time: string;
  image?: string;  // data URL
  file?: { name: string; size: string; dataUrl?: string };
};

type Conversation = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
};

const CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    name: 'Nguyễn Văn Hùng',
    role: 'Project Manager',
    avatar: 'H',
    avatarColor: 'bg-indigo-500',
    lastMessage: 'Anh xem lại phần báo cáo tuần này nhé, cần cập nhật thêm tiến độ.',
    time: '10:32',
    unread: 3,
    online: true,
    messages: [
      { id: 1, from: 'them', text: 'Chào anh, anh có thể review lại sprint plan không ạ?', time: '10:20' },
      { id: 2, from: 'me', text: 'Ok em, anh sẽ xem trong hôm nay.', time: '10:25' },
      { id: 3, from: 'them', text: 'Anh xem lại phần báo cáo tuần này nhé, cần cập nhật thêm tiến độ.', time: '10:32' },
    ],
  },
  {
    id: 2,
    name: 'Trần Thị Mai',
    role: 'Developer',
    avatar: 'M',
    avatarColor: 'bg-pink-500',
    lastMessage: 'Em đã push code lên branch feature/dashboard rồi anh ơi.',
    time: '09:15',
    unread: 1,
    online: true,
    messages: [
      { id: 1, from: 'me', text: 'Mai ơi, code phần chart xong chưa?', time: '09:00' },
      { id: 2, from: 'them', text: 'Em đã push code lên branch feature/dashboard rồi anh ơi.', time: '09:15' },
    ],
  },
  {
    id: 3,
    name: 'Nhóm OMES Core',
    role: '5 thành viên',
    avatar: 'G',
    avatarColor: 'bg-teal-500',
    lastMessage: 'Lê Dũng: Meeting lúc 2h chiều nay mọi người nhớ tham gia.',
    time: 'Hôm qua',
    unread: 0,
    online: false,
    messages: [
      { id: 1, from: 'them', text: 'Lê Dũng: Meeting lúc 2h chiều nay mọi người nhớ tham gia.', time: 'Hôm qua' },
    ],
  },
  {
    id: 4,
    name: 'Phạm Đức Anh',
    role: 'BA',
    avatar: 'A',
    avatarColor: 'bg-amber-500',
    lastMessage: 'Tài liệu yêu cầu đã được cập nhật, mọi người check lại nhé.',
    time: 'Hôm qua',
    unread: 0,
    online: false,
    messages: [
      { id: 1, from: 'them', text: 'Tài liệu yêu cầu đã được cập nhật, mọi người check lại nhé.', time: 'Hôm qua' },
    ],
  },
  {
    id: 5,
    name: 'Lê Thị Hương',
    role: 'Tester',
    avatar: 'H',
    avatarColor: 'bg-green-500',
    lastMessage: 'Em tìm thấy bug ở màn hình login, anh assign ticket cho em nhé.',
    time: 'T2',
    unread: 0,
    online: false,
    messages: [
      { id: 1, from: 'them', text: 'Em tìm thấy bug ở màn hình login, anh assign ticket cho em nhé.', time: 'T2' },
    ],
  },
];

// ── Chat Bubble (portal, fixed bottom-right) ───────────────────────────────────

type ChatBubbleProps = {
  conv: Conversation;
  index: number;
  onClose: (id: number) => void;
};

function ChatBubble({ conv, index, onClose }: ChatBubbleProps) {
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(conv.messages);
  const [attachPreviews, setAttachPreviews] = useState<{ type: 'image' | 'file'; name: string; size: string; dataUrl?: string }[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rightOffset = 12 + index * 332;

  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [input]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text && attachPreviews.length === 0) return;
    const newMsgs: Message[] = [];
    if (text) {
      newMsgs.push({ id: Date.now(), from: 'me', text, time: 'Vừa xong' });
    }
    attachPreviews.forEach((a, i) => {
      if (a.type === 'image') {
        newMsgs.push({ id: Date.now() + i + 1, from: 'me', image: a.dataUrl, time: 'Vừa xong' });
      } else {
        newMsgs.push({ id: Date.now() + i + 1, from: 'me', file: { name: a.name, size: a.size, dataUrl: a.dataUrl }, time: 'Vừa xong' });
      }
    });
    setMessages((prev) => [...prev, ...newMsgs]);
    setInput('');
    setAttachPreviews([]);
  }, [input, attachPreviews]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const sizeMB = file.size / 1024 / 1024;
      const sizeStr = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachPreviews((prev) => [...prev, { type: 'image', name: file.name, size: sizeStr, dataUrl: ev.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachPreviews((prev) => [...prev, { type: 'file', name: file.name, size: sizeStr, dataUrl: ev.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  }, []);

  const bubble = (
    <div
      className="fixed bottom-0 z-[9999] flex flex-col rounded-t-xl overflow-hidden border border-gray-200 bg-white"
      style={{ right: rightOffset, width: 320, boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}
        onClick={() => setMinimized((v) => !v)}
      >
        <div className="relative shrink-0">
          <div className={`h-8 w-8 rounded-full ${conv.avatarColor} border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold`}>
            {conv.avatar}
          </div>
          {conv.online && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-teal-700"></span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-none">{conv.name}</p>
          <p className="text-[10px] text-teal-100 mt-0.5">{conv.online ? 'Đang hoạt động' : conv.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized((v) => !v); }}
            className="p-1 rounded text-teal-100 hover:bg-white/20 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={minimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(conv.id); }}
            className="p-1 rounded text-teal-100 hover:bg-white/20 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <>
          <div className="flex flex-col gap-2 px-3 py-3 overflow-y-auto bg-gray-50" style={{ height: 300 }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                {msg.from === 'them' && (
                  <div className={`h-6 w-6 rounded-full ${conv.avatarColor} flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-auto`}>
                    {conv.avatar}
                  </div>
                )}
                <div className="max-w-[80%]">
                  {msg.image ? (
                    <div className="relative group/img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.image}
                        alt="ảnh"
                        onClick={() => setLightbox(msg.image!)}
                        className="rounded-xl max-w-[200px] max-h-[180px] object-cover border border-gray-200 cursor-zoom-in block"
                      />
                      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
                        <button
                          onClick={() => setLightbox(msg.image!)}
                          className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow"
                          title="Xem ảnh"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                          </svg>
                        </button>
                        <a
                          href={msg.image}
                          download="image"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow"
                          title="Tải ảnh"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ) : msg.file ? (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                        <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{msg.file.name}</p>
                        <p className="text-[10px] text-gray-400">{msg.file.size}</p>
                      </div>
                      <a
                        href={msg.file.dataUrl ?? '#'}
                        download={msg.file.name}
                        className="text-teal-500 hover:text-teal-700 shrink-0 p-1 rounded hover:bg-teal-50 transition-colors"
                        title="Tải xuống"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  ) : (
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${msg.from === 'me' ? 'bg-teal-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  )}
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.from === 'me' ? 'text-right' : 'ml-1'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Attachment previews */}
          {attachPreviews.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1 bg-white border-t border-gray-100">
              {attachPreviews.map((a, i) => (
                <div key={i} className="relative group">
                  {a.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.dataUrl} alt={a.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1.5 max-w-[140px]">
                      <svg className="h-4 w-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-gray-700 truncate">{a.name}</p>
                        <p className="text-[9px] text-gray-400">{a.size}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setAttachPreviews((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-end gap-1.5 px-2 py-2 border-t border-gray-100 bg-white">
            {/* Attach file */}
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors shrink-0 mb-0.5"
              title="Đính kèm file"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            {/* Image button */}
            <button
              onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt'; }, 100); } }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors shrink-0 mb-0.5"
              title="Gửi ảnh"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-gray-50 resize-none leading-relaxed [&::-webkit-scrollbar]:hidden"
              style={{ minHeight: 32, maxHeight: 96, scrollbarWidth: 'none' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() && attachPreviews.length === 0}
              className="p-1.5 rounded-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white transition-colors shrink-0 mb-0.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );

  const lightboxPortal = lightbox
    ? createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/85 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={lightbox}
              download="image"
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
              title="Tải ảnh"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button
              onClick={() => setLightbox(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
              title="Đóng"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  if (typeof window === 'undefined') return null;
  return <>{createPortal(bubble, document.body)}{lightboxPortal}</>;
}

// ── Notification Panel ─────────────────────────────────────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const query = useQuery<{ data: Array<{ id: string; title: string; message: string; createdAt: string; unread: boolean; type?: string; link?: string }>; meta: { unread: number } }>({
    queryKey: ['notifications', tab],
    queryFn: () => fetch(`/api/notifications?limit=30${tab === 'unread' ? '&unreadOnly=true' : ''}`).then((r) => r.json()),
    staleTime: 10_000,
  });

  function resolveNotificationLink(n: { type?: string; link?: string }) {
    const raw = n.link ?? '/work';
    const [path, queryString = ''] = raw.split('?');
    const params = new URLSearchParams(queryString);
    if (n.type === 'mention' && params.get('taskId') && !params.get('openTab')) {
      params.set('openTab', 'comments');
    }
    params.set('_nt', Date.now().toString());
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }

  function emitOpenTaskEvent(link: string) {
    if (typeof window === 'undefined') return;
    const [_, queryString = ''] = link.split('?');
    const params = new URLSearchParams(queryString);
    const taskId = params.get('taskId');
    if (!taskId) return;
    const openTab = params.get('openTab') === 'comments' ? 'comments' : 'details';
    window.dispatchEvent(new CustomEvent('omes:open-task-from-notification', { detail: { taskId, openTab } }));
  }

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error('Mark all failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Mark failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const displayed = query.data?.data ?? [];
  const unreadCount = query.data?.meta?.unread ?? 0;

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden" style={{ maxHeight: 480 }}>
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-1">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${tab === t ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {t === 'all' ? 'Tất cả' : 'Chưa đọc'}
              {t === 'unread' && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 leading-none py-0.5">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="h-10 w-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-xs">Không có thông báo</p>
          </div>
        ) : (
          displayed.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (n.unread) await markOneMutation.mutateAsync(n.id);
                onClose();
                const link = resolveNotificationLink(n);
                emitOpenTaskEvent(link);
                router.push(link);
              }}
              className={`w-full text-left flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${n.unread ? 'bg-teal-50/40' : ''}`}
            >
              <div className="h-9 w-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                @
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold leading-snug ${n.unread ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                  {n.unread && <span className="h-2 w-2 rounded-full bg-teal-500 mt-1 shrink-0"></span>}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => markAllMutation.mutate()}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          Đánh dấu tất cả đã đọc
        </button>
        <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setTab('all')}>Làm mới</button>
      </div>
    </div>
  );
}

// ── Message Dropdown ───────────────────────────────────────────────────────────

function MessageDropdown({ onOpen, onClose }: { onOpen: (c: Conversation) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = CONVERSATIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden" style={{ maxHeight: 460 }}>
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Tin nhắn</h3>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-gray-50"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => { onOpen(c); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
          >
            <div className="relative shrink-0">
              <div className={`h-10 w-10 rounded-full ${c.avatarColor} flex items-center justify-center text-white text-xs font-semibold`}>
                {c.avatar}
              </div>
              {c.online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-white"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-xs truncate ${c.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{c.name}</p>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">{c.time}</span>
              </div>
              <p className={`text-[11px] truncate mt-0.5 ${c.unread ? 'font-medium text-gray-700' : 'text-gray-500'}`}>{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-teal-500 text-white text-[10px] flex items-center justify-center font-semibold shrink-0">
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5 text-center">
        <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">Xem tất cả tin nhắn</button>
      </div>
    </div>
  );
}

// ── Account Menu ───────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: 'Quản trị viên',
    admin: 'Admin',
    manager: 'Quản lý',
    employee: 'Nhân viên',
    viewer: 'Viewer',
  };
  return map[role] ?? role;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const currentUser = usePlatformStore((s) => s.currentUser);
  const setCurrentUser = usePlatformStore((s) => s.setCurrentUser);

  const initials = currentUser ? getInitials(currentUser.fullName) : 'U';
  const displayName = currentUser?.fullName ?? 'Người dùng';
  const displayEmail = currentUser?.email ?? '';
  const displayRole = currentUser ? roleLabel(currentUser.globalRole) : '';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    onClose();
    router.replace('/login');
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1.5 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-semibold">{initials}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400 truncate">{displayEmail}</p>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] bg-teal-50 text-teal-700 rounded font-medium">{displayRole}</span>
          </div>
        </div>
      </div>
      {[
        { d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Thông tin cá nhân', href: '/account' },
        { d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Trợ giúp & Hướng dẫn', href: null },
      ].map((item) => (
        <button
          key={item.label}
          onClick={() => { onClose(); if (item.href) router.push(item.href); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={item.d} />
          </svg>
          {item.label}
        </button>
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors text-left">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

// ── Main TopBar ────────────────────────────────────────────────────────────────

export default function TopBar() {
  const currentUser = usePlatformStore((s) => s.currentUser);
  const [open, setOpen] = useState<'notifications' | 'messages' | 'account' | null>(null);
  const [openChats, setOpenChats] = useState<Conversation[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const toggle = (panel: 'notifications' | 'messages' | 'account') =>
    setOpen((p) => (p === panel ? null : panel));

  const openChat = useCallback((conv: Conversation) => {
    setOpenChats((prev) => {
      if (prev.find((c) => c.id === conv.id)) return prev;
      const next = prev.length >= 3 ? prev.slice(1) : prev;
      return [...next, conv];
    });
  }, []);

  const closeChat = useCallback((id: number) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const notifQuery = useQuery<{ meta: { unread: number } }>({
    queryKey: ['notifications', 'badge'],
    queryFn: () => fetch('/api/notifications?limit=1').then((r) => r.json()),
    staleTime: 10_000,
  });
  const notifUnread = notifQuery.data?.meta?.unread ?? 0;
  const msgUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  return (
    <>
      <div
        ref={ref}
        className="border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-end gap-2 shrink-0 relative"
      >
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => toggle('notifications')}
            className={`relative p-1.5 rounded-lg transition-colors ${open === 'notifications' ? 'bg-teal-50 text-teal-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {notifUnread}
              </span>
            )}
          </button>
          {open === 'notifications' && <NotificationPanel onClose={() => setOpen(null)} />}
        </div>

        {/* Messages */}
        <div className="relative">
          <button
            onClick={() => toggle('messages')}
            className={`relative p-1.5 rounded-lg transition-colors ${open === 'messages' ? 'bg-teal-50 text-teal-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {msgUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {msgUnread}
              </span>
            )}
          </button>
          {open === 'messages' && <MessageDropdown onOpen={openChat} onClose={() => setOpen(null)} />}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 mx-1"></div>

        {/* Account */}
        <div className="relative">
          <button
            onClick={() => toggle('account')}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${open === 'account' ? 'bg-teal-50' : 'hover:bg-gray-100'}`}
          >
            <div className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-semibold">
              {currentUser ? getInitials(currentUser.fullName) : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-gray-800 leading-none">{currentUser?.fullName ?? 'Người dùng'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{currentUser?.email ?? ''}</p>
            </div>
            <svg
              className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open === 'account' ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === 'account' && <AccountMenu onClose={() => setOpen(null)} />}
        </div>
      </div>

      {/* Chat bubbles – portal at bottom-right of viewport */}
      {openChats.map((conv, i) => (
        <ChatBubble key={conv.id} conv={conv} index={i} onClose={closeChat} />
      ))}
    </>
  );
}
