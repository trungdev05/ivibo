import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import { listIssues, upsertIssue } from '@/lib/omes-mock';

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ data: listIssues() });
}

export async function POST(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await req.json();

  // Basic automation guard: done issues must include resolution
  if (payload?.status === 'Done' && !payload?.resolution) {
    return NextResponse.json({ error: 'Resolution is required when issue is Done' }, { status: 400 });
  }

  return NextResponse.json({ data: upsertIssue(payload) }, { status: 201 });
}
