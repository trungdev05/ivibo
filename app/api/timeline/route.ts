import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { getProjectOverviewList, getTimelinePhases } from '@/lib/omes-mock';

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  if (projectId) return NextResponse.json({ data: getTimelinePhases(projectId) });

  const all = getProjectOverviewList().flatMap((project) =>
    getTimelinePhases(project.id).map((phase) => ({ ...phase, projectId: project.id, projectName: project.projectName }))
  );

  return NextResponse.json({ data: all });
}
