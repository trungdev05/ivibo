import { NextRequest, NextResponse } from 'next/server';
import { listNotificationsForUser } from '@/lib/omes-mock';
import { getCurrentOmesUser } from '@/lib/server-identity';

export async function GET(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const data = listNotificationsForUser(user.id, { unreadOnly, limit });
  const unread = listNotificationsForUser(user.id, { unreadOnly: true, limit: 1000 }).length;

  return NextResponse.json({
    data,
    meta: {
      total: data.length,
      unread,
      limit,
      unreadOnly,
    },
  });
}
