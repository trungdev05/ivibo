import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { getProjectDetail, upsertProject } from '@/lib/omes-mock';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const data = getProjectDetail(id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const current = getProjectDetail(id);
  if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const payload = await req.json();
  const data = upsertProject({ ...payload, id });
  return NextResponse.json({ data });
}
