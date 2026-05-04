import { NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { canAccessTicketWorkspace, hasMyTickets } from '@/lib/omes-mock';

export async function GET() {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mine = hasMyTickets(user.fullName);
  const hasAccess = user.globalRole === 'super_admin' || canAccessTicketWorkspace({ fullName: user.fullName });

  return NextResponse.json({ data: { ...mine, hasAccess } });
}
