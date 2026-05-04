import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { getMyWorkSummary } from '@/lib/omes-mock';

/**
 * GET /api/work/my/summary
 * Returns KPI counts for the current user's tasks and tickets across all projects.
 */
export async function GET(_req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const summary = getMyWorkSummary(user.fullName);

  return NextResponse.json({ data: summary });
}
