import { NextRequest, NextResponse } from 'next/server';
import { deletePersonalTask, updatePersonalTask } from '@/lib/omes-mock';
import { getCurrentOmesUser } from '@/lib/server-identity';
import type { PersonalTaskStatus, TaskPriority } from '@/lib/omes-types';

const VALID_STATUS = new Set<PersonalTaskStatus>(['Todo', 'In Progress', 'Done', 'Cancelled']);
const VALID_PRIORITY = new Set<TaskPriority>(['High', 'Medium', 'Low']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: {
    title?: string;
    description?: string;
    status?: PersonalTaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.status && !VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (body.priority && !VALID_PRIORITY.has(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }
  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
  }

  const updated = updatePersonalTask(user.fullName, id, {
    ...body,
    title: body.title?.trim(),
  });

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const deleted = deletePersonalTask(user.fullName, id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
