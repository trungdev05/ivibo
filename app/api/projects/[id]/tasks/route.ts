import { deleteTask, listTasks, upsertTask } from '@/lib/omes-mock';
import { ensureTaskIdField, getProjectWorkBaseTaskTable, removeWorkBaseTaskRecord, upsertWorkBaseTaskRecord } from '@/lib/mock-data';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data = listTasks(id);

  // mode=mine filters to tasks where the current user is assignee or reporter
  const mode = req.nextUrl.searchParams.get('mode');
  if (mode === 'mine') {
    const user = await getCurrentOmesUser();
    if (user) {
      data = data.filter((t) => t.assignee === user.fullName || t.reporter === user.fullName);
    }
  }

  const { searchParams } = req.nextUrl;
  const sortBy = searchParams.get('sortBy');
  const sortDirection = searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';

  if (sortBy) {
    data = [...data].sort((a, b) => {
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
  }

  const hasPaging = searchParams.has('page') || searchParams.has('pageSize');
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '10')));
  const total = data.length;

  if (!hasPaging) {
    return NextResponse.json({
      data,
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
  const pagedData = data.slice(start, start + pageSize);

  return NextResponse.json({
    data: pagedData,
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
  const { id } = await params;
  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const task = upsertTask(id, body);
  // Sync to WorkBase (idempotent — runs only if WorkBase has been bootstrapped)
  const wb = getProjectWorkBaseTaskTable(id);
  if (wb) {
    upsertWorkBaseTaskRecord(wb.tableId, wb.taskIdFieldId, {
      id: task.id, title: task.title, status: task.status, priority: task.priority,
      assignee: task.assignee, startDate: task.startDate, dueDate: task.dueDate,
      estimatedHours: task.estimatedHours, actualHours: task.actualHours, note: task.note,
    });
  }
  return NextResponse.json({ data: task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: _projectId } = await params;
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }
  const ok = deleteTask(taskId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Remove from WorkBase
  const wb = getProjectWorkBaseTaskTable(_projectId);
  if (wb) removeWorkBaseTaskRecord(wb.tableId, wb.taskIdFieldId, taskId);
  return NextResponse.json({ ok: true });
}
