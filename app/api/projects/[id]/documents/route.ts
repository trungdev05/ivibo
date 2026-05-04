import { NextRequest, NextResponse } from 'next/server';
import { addActivityLog, deleteDocument, listDocuments, upsertDocument } from '@/lib/omes-mock';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { can, getRoleFromRequest } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ data: listDocuments(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const item = upsertDocument(id, body);
  addActivityLog({ projectId: id, actor: body.uploadedBy ?? 'PM', action: body.id ? OMES_ACTIVITY_ACTIONS.document.update : OMES_ACTIVITY_ACTIONS.document.create, module: OMES_ACTIVITY_MODULES.document, entity: item.name, timestamp: new Date().toISOString().slice(0, 10), status: 'Done', notes: '' });
  return NextResponse.json({ data: item }, { status: body.id ? 200 : 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('docId');
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
  const ok = deleteDocument(docId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  addActivityLog({ projectId: id, actor: 'PM', action: OMES_ACTIVITY_ACTIONS.document.delete, module: OMES_ACTIVITY_MODULES.document, entity: docId, timestamp: new Date().toISOString().slice(0, 10), status: 'Done', notes: '' });
  return NextResponse.json({ ok: true });
}