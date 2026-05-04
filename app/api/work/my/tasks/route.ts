import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { listMyTasks } from '@/lib/omes-mock';

/**
 * GET /api/work/my/tasks
 * Returns cross-project tasks assigned to or created by the current user.
 *
 * Query params:
 *   projectId  — filter to a single project
 *   status     — filter by task status
 *   priority   — filter by priority (High|Medium|Low)
 *   overdue    — 'true' to return only overdue tasks
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const overdueOnly = searchParams.get('overdue') === 'true';
  const sortBy = searchParams.get('sortBy') ?? 'dueDate';
  const sortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '10')));

  let tasks = listMyTasks(user.fullName);

  if (projectId === 'personal') tasks = tasks.filter((t) => t.isPersonal);
  else if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
  if (status) tasks = tasks.filter((t) => t.status === status);
  if (priority) tasks = tasks.filter((t) => t.priority === priority);
  if (overdueOnly) {
    const today = new Date().toISOString().slice(0, 10);
    tasks = tasks.filter((t) => {
      const closed = t.status === 'Done' || t.status === 'Cancelled';
      return !closed && t.dueDate && t.dueDate < today;
    });
  }

  tasks.sort((a, b) => {
    let compare = 0;
    if (sortBy === 'priority') {
      const order: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
      compare = (order[a.priority] ?? 999) - (order[b.priority] ?? 999);
    } else if (sortBy === 'status') {
      compare = a.status.localeCompare(b.status);
    } else if (sortBy === 'updatedAt') {
      compare = (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
    } else {
      compare = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
    }
    return sortDirection === 'asc' ? compare : -compare;
  });

  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const data = tasks.slice(start, start + pageSize);

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
