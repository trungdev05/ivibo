'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { MetricCard, StatusPill } from './ui';
import { ProjectFormModal } from './project-form-modal';
import { OmesProject } from '@/lib/omes-types';

type ProjectOverview = {
  id: string;
  projectName: string;
  customer: string;
  pmOwner: string;
  projectPhase: string;
  startDate: string;
  endDate: string;
  overallHealth: string;
  progress: number;
  budgetStatus: string;
  riskStatus: string;
  slaStatus: string;
  latestUpdate: string;
  nextMilestone: string;
};

export function ProjectOverviewPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; project: Partial<OmesProject> | null }>({
    open: false,
    project: null,
  });

  const query = useQuery({
    queryKey: ['omes-project-overview'],
    queryFn: async () => {
      const res = await fetch('/api/projects/overview', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load project overview');
      return payload.data as ProjectOverview[];
    },
  });

  if (query.isPending) return <div className="p-6 text-sm text-gray-500">Loading project overview...</div>;
  if (query.error) return <div className="p-6 text-sm text-red-600">{query.error.message}</div>;

  const projects = query.data ?? [];

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tổng quan dự án</h1>
          <p className="text-sm text-gray-500">Danh mục dự án OMES</p>
        </div>
        <button
          onClick={() => setModal({ open: true, project: null })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm dự án
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Dự án" value={projects.length} />
        <MetricCard label="Trễ tiến độ" value={projects.filter((p) => p.overallHealth === 'red').length} tone="danger" />
        <MetricCard label="Vi phạm SLA" value={projects.filter((p) => p.slaStatus === 'Breached').length} tone="warn" />
        <MetricCard label="Có rủi ro" value={projects.filter((p) => p.riskStatus !== 'Stable').length} tone="warn" />
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="relative rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow group">
            {/* Edit button */}
            <button
              onClick={(e) => { e.preventDefault(); setModal({ open: true, project: { id: project.id, projectName: project.projectName, customer: project.customer, pmOwner: project.pmOwner, projectPhase: project.projectPhase, startDate: project.startDate, endDate: project.endDate } }); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Chỉnh sửa dự án"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <Link href={`/projects/${project.id}`} className="block">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{project.projectName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{project.customer} · PM: {project.pmOwner}</p>
                </div>
                <StatusPill value={project.overallHealth} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-xs">
                <Field label="Giai đoạn" value={project.projectPhase} />
                <Field label="Bắt đầu" value={project.startDate} />
                <Field label="Kết thúc" value={project.endDate} />
                <Field label="Tiến độ" value={`${project.progress}%`} />
                <Field label="Ngân sách" value={project.budgetStatus} />
                <Field label="Rủi ro" value={project.riskStatus} />
                <Field label="SLA" value={project.slaStatus} />
                <Field label="Cập nhật mới nhất" value={project.latestUpdate} />
                <Field label="Mốc tiếp theo" value={project.nextMilestone} />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {modal.open && (
        <ProjectFormModal
          project={modal.project}
          onClose={() => setModal({ open: false, project: null })}
          onSaved={() => {
            setModal({ open: false, project: null });
            queryClient.invalidateQueries({ queryKey: ['omes-project-overview'] });
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}
