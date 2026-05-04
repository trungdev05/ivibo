import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { listMyTickets } from '@/lib/omes-mock';

/**
 * GET /api/work/my/tickets
 * Returns cross-project tickets assigned to (owner) or reported by the current user.
 *
 * Query params:
 *   projectId  — filter to a single project
 *   status     — filter by ticket status
 *   priority   — filter by priority (P1|P2|P3|P4)
 *   sla        — 'breached' to return only SLA Breached tickets
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const slaFilter = searchParams.get('sla');
  const sortBy = searchParams.get('sortBy') ?? 'dueDate';
  const sortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '10')));

  let tickets = listMyTickets(user.fullName);

  if (projectId) tickets = tickets.filter((i) => i.projectId === projectId);
  if (status) tickets = tickets.filter((i) => i.status === status);
  if (priority) tickets = tickets.filter((i) => i.priority === priority);
  if (slaFilter === 'breached') tickets = tickets.filter((i) => i.status === 'SLA Breached');

  tickets.sort((a, b) => {
    let compare = 0;
    if (sortBy === 'priority') {
      const order: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
      compare = (order[a.priority] ?? 999) - (order[b.priority] ?? 999);
    } else if (sortBy === 'status') {
      compare = a.status.localeCompare(b.status);
    } else if (sortBy === 'createdDate') {
      compare = (a.createdDate ?? '').localeCompare(b.createdDate ?? '');
    } else {
      compare = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
    }
    return sortDirection === 'asc' ? compare : -compare;
  });

  const total = tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const data = tickets.slice(start, start + pageSize);

  return NextResponse.json({
    data,
    meta: {
      total,
      page: clampedPage,
      pageSize,
      totalPages,
      sortBy,
      sortDirection,
    },
  });
}
