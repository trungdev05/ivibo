import { listMyTasks, updatePersonalTask, upsertTask } from '@/lib/omes-mock';
import { getProjectWorkBaseTaskTable, upsertWorkBaseTaskRecord } from '@/lib/mock-data';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUS = new Set(['Todo', 'In Progress', 'Review', 'Done', 'Blocked', 'Cancelled']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status } = body;
  if (!status || !VALID_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid or missing status' }, { status: 400 });
  }

  // Find the task among the user's tasks (assignee OR reporter OR personal owner)
  const allMyTasks = listMyTasks(user.fullName);
  const task = allMyTasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (task.isPersonal) {
    const updated = updatePersonalTask(user.fullName, id, { status: status as 'Todo' | 'In Progress' | 'Done' | 'Cancelled' });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: updated });
  }

  // Project task — upsert with new status (keeps all other fields)
  const updated = upsertTask(task.projectId!, { id, title: task.title, status: status as 'Todo' | 'In Progress' | 'Review' | 'Done' | 'Blocked' | 'Cancelled' });
  // Sync to WorkBase
  const wb = getProjectWorkBaseTaskTable(updated.projectId!);
  if (wb) {
    upsertWorkBaseTaskRecord(wb.tableId, wb.taskIdFieldId, {
      id: updated.id, title: updated.title, status: updated.status, priority: updated.priority,
      assignee: updated.assignee, startDate: updated.startDate, dueDate: updated.dueDate,
      estimatedHours: updated.estimatedHours, actualHours: updated.actualHours, note: updated.note,
    });
  }
  return NextResponse.json({ data: updated });
}
