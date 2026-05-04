import { ProjectDetailPage } from '@/components/omes/project-detail-page';

export default async function ProjectDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string; taskId?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  return (
    <ProjectDetailPage
      projectId={projectId}
      activeTab={sp?.tab ?? 'overview'}
      basePath="/projects"
      openTaskId={sp?.taskId}
    />
  );
}

