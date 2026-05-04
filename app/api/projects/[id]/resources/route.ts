import { NextRequest, NextResponse } from 'next/server';
import { addActivityLog, deleteResource, listResources, upsertResource } from '@/lib/omes-mock';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { getRoleFromRequest, can } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const resources = listResources(id);
  return NextResponse.json({ data: resources, resources });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  if (!body.person) return NextResponse.json({ error: 'person is required' }, { status: 400 });

  const saved = upsertResource(id, body);
  addActivityLog({
    projectId: id,
    actor: 'PM',
    action: body.id ? OMES_ACTIVITY_ACTIONS.member.update : OMES_ACTIVITY_ACTIONS.member.create,
    module: OMES_ACTIVITY_MODULES.member,
    entity: saved.person,
    timestamp: new Date().toISOString(),
    status: 'Done',
    notes: '',
  });
  return NextResponse.json({ data: saved, resource: saved });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const resourceId = req.nextUrl.searchParams.get('resourceId');
  if (!resourceId) return NextResponse.json({ error: 'resourceId required' }, { status: 400 });

  const ok = deleteResource(resourceId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  addActivityLog({
    projectId: id,
    actor: 'PM',
    action: OMES_ACTIVITY_ACTIONS.member.delete,
    module: OMES_ACTIVITY_MODULES.member,
    entity: resourceId,
    timestamp: new Date().toISOString(),
    status: 'Done',
    notes: '',
  });
  return NextResponse.json({ ok: true });
}
