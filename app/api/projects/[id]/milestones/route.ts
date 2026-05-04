import { NextRequest, NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { addActivityLog, deleteMilestone, listMilestones, upsertMilestone } from '@/lib/omes-mock';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ data: listMilestones(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (!body?.phase) return NextResponse.json({ error: 'phase required' }, { status: 400 });
  if (!body?.startDate || !body?.endDate) return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  const item = upsertMilestone(id, body);
  addActivityLog({
    projectId: id,
    actor: body.owner ?? 'PM',
    action: body.id ? OMES_ACTIVITY_ACTIONS.milestone.update : OMES_ACTIVITY_ACTIONS.milestone.create,
    module: OMES_ACTIVITY_MODULES.milestone,
    entity: item.phase,
    timestamp: new Date().toISOString().slice(0, 10),
    status: item.status,
    notes: '',
  });
  return NextResponse.json({ data: item }, { status: body.id ? 200 : 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const milestoneId = searchParams.get('milestoneId');
  if (!milestoneId) return NextResponse.json({ error: 'milestoneId required' }, { status: 400 });
  const ok = deleteMilestone(milestoneId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  addActivityLog({
    projectId: id,
    actor: 'PM',
    action: OMES_ACTIVITY_ACTIONS.milestone.delete,
    module: OMES_ACTIVITY_MODULES.milestone,
    entity: milestoneId,
    timestamp: new Date().toISOString().slice(0, 10),
    status: 'Done',
    notes: '',
  });
  return NextResponse.json({ ok: true });
}
