import { NextRequest, NextResponse } from 'next/server';
import { createPersonalTask, listPersonalTasks } from '@/lib/omes-mock';
import { getCurrentOmesUser } from '@/lib/server-identity';
import type { PersonalTaskStatus, TaskPriority } from '@/lib/omes-types';

const VALID_STATUS = new Set<PersonalTaskStatus>(['Todo', 'In Progress', 'Done', 'Cancelled']);
const VALID_PRIORITY = new Set<TaskPriority>(['High', 'Medium', 'Low']);

export async function GET() {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: listPersonalTasks(user.fullName) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (body.status && !VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (body.priority && !VALID_PRIORITY.has(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  const created = createPersonalTask(user.fullName, {
    title: body.title.trim(),
    description: body.description ?? '',
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
