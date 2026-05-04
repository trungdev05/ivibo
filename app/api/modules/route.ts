import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { listModules, upsertModule } from '@/lib/omes-mock';

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ data: listModules() });
}

export async function POST(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await req.json();
  return NextResponse.json({ data: upsertModule(payload) }, { status: 201 });
}
