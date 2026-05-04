'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PersonalTaskStatus, TaskPriority } from '@/lib/omes-types';
import { SearchableSelect } from './ui';

type PersonalTaskDto = {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: PersonalTaskStatus;
  priority: TaskPriority;
  ownerName: string;
  dueDate?: string;
};

type Props = {
  open: boolean;
  task: PersonalTaskDto | null;
  onClose: () => void;
};

type Payload = {
  title: string;
  description?: string;
  status: PersonalTaskStatus;
  priority: TaskPriority;
  dueDate?: string;
};

const DEFAULT_FORM: Payload = {
  title: '',
  description: '',
  status: 'Todo',
  priority: 'Medium',
  dueDate: '',
};

export function PersonalTaskModal({ open, task, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Payload>(DEFAULT_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? '',
      });
      setError('');
      return;
    }
    setForm(DEFAULT_FORM);
    setError('');
  }, [open, task]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Payload) => {
      const endpoint = task ? `/api/work/personal-tasks/${task.id}` : '/api/work/personal-tasks';
      const method = task ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Không thể lưu công việc');
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-tasks'] }),
        qc.invalidateQueries({ queryKey: ['my-work-summary'] }),
        qc.invalidateQueries({ queryKey: ['personal-tasks'] }),
      ]);
      onClose();
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  if (!open) return null;

  const submit = () => {
    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc');
      return;
    }
    saveMutation.mutate({
      ...form,
      title: form.title.trim(),
      dueDate: form.dueDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {task ? 'Cập nhật công việc cá nhân' : 'Thêm công việc cá nhân'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Công việc này không gắn với dự án cụ thể.</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tiêu đề</label>
            <input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Nhập tiêu đề"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-20"
              placeholder="Ghi chú ngắn"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Trạng thái</label>
              <SearchableSelect
                value={form.status}
                onChange={(v) => setForm((s) => ({ ...s, status: v as PersonalTaskStatus }))}
                options={[
                  { value: 'Todo', label: 'Chờ làm' },
                  { value: 'In Progress', label: 'Đang làm' },
                  { value: 'Done', label: 'Hoàn thành' },
                  { value: 'Cancelled', label: 'Hủy' },
                ]}
                placeholder="Chọn trạng thái"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ưu tiên</label>
              <SearchableSelect
                value={form.priority}
                onChange={(v) => setForm((s) => ({ ...s, priority: v as TaskPriority }))}
                options={[
                  { value: 'High', label: 'Cao' },
                  { value: 'Medium', label: 'Trung bình' },
                  { value: 'Low', label: 'Thấp' },
                ]}
                placeholder="Chọn ưu tiên"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Hạn chót</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            disabled={saveMutation.isPending}
          >
            Hủy
          </button>
          <button
            onClick={submit}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Đang lưu...' : task ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
