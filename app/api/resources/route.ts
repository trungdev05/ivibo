import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { listResources, upsertResource } from '@/lib/omes-mock';

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') ?? '';
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  return NextResponse.json({ data: listResources(projectId) });
}

export async function POST(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await req.json();
  const projectId = payload?.projectId as string | undefined;
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  if (!payload?.person) return NextResponse.json({ error: 'person is required' }, { status: 400 });
  return NextResponse.json({ data: upsertResource(projectId, payload) }, { status: 201 });
}
