import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { listDailyUpdates, upsertDailyUpdate } from '@/lib/omes-mock';

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ data: listDailyUpdates() });
}

export async function POST(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await req.json();
  return NextResponse.json({ data: upsertDailyUpdate(payload) }, { status: 201 });
}
