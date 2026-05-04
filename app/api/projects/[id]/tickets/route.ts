import { NextRequest, NextResponse } from 'next/server';
import { addActivityLog, deleteIssue, listIssues, upsertIssue } from '@/lib/omes-mock';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { can, getRoleFromRequest } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  let issues = listIssues().filter((i) => i.projectId === id);

  // mode=mine filters to tickets where the current user is owner or reporter
  const mode = req.nextUrl.searchParams.get('mode');
  if (mode === 'mine') {
    const { getCurrentOmesUser } = await import('@/lib/server-identity');
    const user = await getCurrentOmesUser();
    if (user) {
      issues = issues.filter((i) => i.owner === user.fullName || i.reporter === user.fullName);
    }
  }

  const { searchParams } = req.nextUrl;
  const sortBy = searchParams.get('sortBy');
  const sortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';

  if (sortBy) {
    issues = [...issues].sort((a, b) => {
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
  }

  const hasPaging = searchParams.has('page') || searchParams.has('pageSize');
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '10')));
  const total = issues.length;

  if (!hasPaging) {
    return NextResponse.json({
      data: issues,
      meta: {
        total,
        page: 1,
        pageSize: total || pageSize,
        totalPages: 1,
        sortBy: sortBy ?? null,
        sortDirection,
      },
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pagedIssues = issues.slice(start, start + pageSize);

  return NextResponse.json({
    data: pagedIssues,
    meta: {
      total,
      page: clampedPage,
      pageSize,
      totalPages,
      sortBy: sortBy ?? null,
      sortDirection,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (!body?.description) return NextResponse.json({ error: 'description required' }, { status: 400 });
  // Auto-fill resolution if closing without one
  if (body.status === 'Done' && !body.resolution) {
    body.resolution = 'Đã xử lý';
  }
  const item = upsertIssue({ ...body, projectId: id });
  addActivityLog({ projectId: id, actor: body.reporter ?? 'PM', action: body.id ? OMES_ACTIVITY_ACTIONS.ticket.update : OMES_ACTIVITY_ACTIONS.ticket.create(item.issueCode), module: OMES_ACTIVITY_MODULES.ticket, entity: item.description, timestamp: new Date().toISOString().slice(0, 10), status: item.status, notes: item.countermeasure || '' });
  return NextResponse.json({ data: item }, { status: body.id ? 200 : 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get('ticketId');
  if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });
  const ok = deleteIssue(ticketId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  addActivityLog({ projectId: id, actor: 'PM', action: OMES_ACTIVITY_ACTIONS.ticket.delete, module: OMES_ACTIVITY_MODULES.ticket, entity: ticketId, timestamp: new Date().toISOString().slice(0, 10), status: 'Done', notes: '' });
  return NextResponse.json({ ok: true });
}
