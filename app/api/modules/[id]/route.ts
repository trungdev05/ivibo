import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { listModules, upsertModule } from '@/lib/omes-mock';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const exists = listModules().some((module) => module.id === id);
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const payload = await req.json();
  const data = upsertModule({ ...payload, id });
  return NextResponse.json({ data });
}
