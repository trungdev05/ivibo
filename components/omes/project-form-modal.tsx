'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { OmesProject } from '@/lib/omes-types';

type FormData = {
  projectCode: string;
  projectName: string;
  customer: string;
  industry: string;
  pmOwner: string;
  startDate: string;
  endDate: string;
  status: OmesProject['status'];
  priority: OmesProject['priority'];
  projectPhase: string;
  bacBudget: string;
  pv: string;
  ev: string;
  ac: string;
  notes: string;
};

const EMPTY: FormData = {
  projectCode: '',
  projectName: '',
  customer: '',
  industry: '',
  pmOwner: '',
  startDate: '',
  endDate: '',
  status: 'Not Started',
  priority: 'Medium',
  projectPhase: 'Design',
  bacBudget: '',
  pv: '',
  ev: '',
  ac: '',
  notes: '',
};

const STATUS_OPTIONS: OmesProject['status'][] = ['Not Started', 'In Progress', 'On Hold', 'Done', 'Delayed'];
const PRIORITY_OPTIONS: OmesProject['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const PHASE_OPTIONS = ['Initiation', 'Planning', 'Design', 'Development', 'Testing', 'UAT', 'Deployment', 'Closure'];

interface Props {
  project?: Partial<OmesProject> | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectFormModal({ project, onClose, onSaved }: Props) {
  const isEdit = !!project?.id;
  const [form, setForm] = useState<FormData>(() => {
    if (!project) return EMPTY;
    return {
      projectCode: project.projectCode ?? '',
      projectName: project.projectName ?? '',
      customer: project.customer ?? '',
      industry: project.industry ?? '',
      pmOwner: project.pmOwner ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
      status: project.status ?? 'Not Started',
      priority: project.priority ?? 'Medium',
      projectPhase: project.projectPhase ?? 'Design',
      bacBudget: project.bacBudget != null ? String(project.bacBudget) : '',
      pv: project.pv != null ? String(project.pv) : '',
      ev: project.ev != null ? String(project.ev) : '',
      ac: project.ac != null ? String(project.ac) : '',
      notes: project.notes ?? '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        projectCode: form.projectCode,
        projectName: form.projectName,
        customer: form.customer,
        industry: form.industry,
        pmOwner: form.pmOwner,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        priority: form.priority,
        projectPhase: form.projectPhase,
        bacBudget: parseFloat(form.bacBudget) || 0,
        pv: parseFloat(form.pv) || 0,
        ev: parseFloat(form.ev) || 0,
        ac: parseFloat(form.ac) || 0,
        notes: form.notes,
      };

      const url = isEdit ? `/api/projects/${project!.id}` : '/api/projects';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error ?? 'Lỗi khi lưu dự án');
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Basic info */}
            <Section title="Thông tin cơ bản">
              <Field label="Mã dự án" required>
                <input ref={firstInputRef} type="text" value={form.projectCode} onChange={(e) => set('projectCode', e.target.value)}
                  className={inputClass} placeholder="OMES-001" required />
              </Field>
              <Field label="Tên dự án" required colSpan={2}>
                <input type="text" value={form.projectName} onChange={(e) => set('projectName', e.target.value)}
                  className={inputClass} placeholder="Tên dự án" required />
              </Field>
              <Field label="Khách hàng" required>
                <input type="text" value={form.customer} onChange={(e) => set('customer', e.target.value)}
                  className={inputClass} placeholder="Tên khách hàng" required />
              </Field>
              <Field label="Ngành">
                <input type="text" value={form.industry} onChange={(e) => set('industry', e.target.value)}
                  className={inputClass} placeholder="Fintech, Healthcare…" />
              </Field>
              <Field label="PM phụ trách" required>
                <input type="text" value={form.pmOwner} onChange={(e) => set('pmOwner', e.target.value)}
                  className={inputClass} placeholder="Nguyễn Văn A" required />
              </Field>
            </Section>

            {/* Dates & Status */}
            <Section title="Tiến độ & Trạng thái">
              <Field label="Ngày bắt đầu" required>
                <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)}
                  className={inputClass} required />
              </Field>
              <Field label="Ngày kết thúc" required>
                <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)}
                  className={inputClass} required />
              </Field>
              <Field label="Trạng thái">
                <select value={form.status} onChange={(e) => set('status', e.target.value as OmesProject['status'])} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Ưu tiên">
                <select value={form.priority} onChange={(e) => set('priority', e.target.value as OmesProject['priority'])} className={inputClass}>
                  {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Giai đoạn">
                <select value={form.projectPhase} onChange={(e) => set('projectPhase', e.target.value)} className={inputClass}>
                  {PHASE_OPTIONS.map((ph) => <option key={ph} value={ph}>{ph}</option>)}
                </select>
              </Field>
            </Section>

            {/* Budget & EVM */}
            <Section title="Ngân sách & EVM">
              <Field label="BAC (Ngân sách)">
                <input type="number" min="0" value={form.bacBudget} onChange={(e) => set('bacBudget', e.target.value)}
                  className={inputClass} placeholder="0" />
              </Field>
              <Field label="PV (Planned Value)">
                <input type="number" min="0" value={form.pv} onChange={(e) => set('pv', e.target.value)}
                  className={inputClass} placeholder="0" />
              </Field>
              <Field label="EV (Earned Value)">
                <input type="number" min="0" value={form.ev} onChange={(e) => set('ev', e.target.value)}
                  className={inputClass} placeholder="0" />
              </Field>
              <Field label="AC (Actual Cost)">
                <input type="number" min="0" value={form.ac} onChange={(e) => set('ac', e.target.value)}
                  className={inputClass} placeholder="0" />
              </Field>
            </Section>

            {/* Notes */}
            <Section title="Ghi chú">
              <Field label="" colSpan={3}>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                  className={inputClass + ' resize-none'} rows={3} placeholder="Ghi chú thêm về dự án…" />
              </Field>
            </Section>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang lưu…' : isEdit ? 'Cập nhật' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  colSpan?: number;
}) {
  return (
    <div style={{ gridColumn: colSpan ? `span ${colSpan}` : undefined }}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
