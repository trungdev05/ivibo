import { NextRequest, NextResponse } from 'next/server';
import { addActivityLog, deleteRequirement, listRequirements, upsertRequirement } from '@/lib/omes-mock';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { can, getRoleFromRequest } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ data: listRequirements(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const item = upsertRequirement(id, body);
  addActivityLog({ projectId: id, actor: body.createdBy ?? 'PM', action: body.id ? OMES_ACTIVITY_ACTIONS.requirement.update : OMES_ACTIVITY_ACTIONS.requirement.create, module: OMES_ACTIVITY_MODULES.requirement, entity: item.title, timestamp: new Date().toISOString().slice(0, 10), status: item.status, notes: '' });
  return NextResponse.json({ data: item }, { status: body.id ? 200 : 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const reqId = searchParams.get('reqId');
  if (!reqId) return NextResponse.json({ error: 'reqId required' }, { status: 400 });
  const ok = deleteRequirement(reqId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  addActivityLog({ projectId: id, actor: 'PM', action: OMES_ACTIVITY_ACTIONS.requirement.delete, module: OMES_ACTIVITY_MODULES.requirement, entity: reqId, timestamp: new Date().toISOString().slice(0, 10), status: 'Done', notes: '' });
  return NextResponse.json({ ok: true });
}
