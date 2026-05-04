import { NextRequest, NextResponse } from 'next/server';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/omes-mock';
import { getCurrentOmesUser } from '@/lib/server-identity';

export async function POST(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.all) {
    const updated = markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true, updated });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required when all=false' }, { status: 400 });
  }

  const ok = markNotificationRead(user.id, body.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, updated: 1 });
}
