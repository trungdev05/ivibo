import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import {
  createBase,
  createTable,
  createWorkspace,
  ensureTaskIdField,
  getBaseById,
  isSupabaseConfigured,
  listBases,
  listWorkspaces,
  upsertWorkBaseTaskRecord,
} from '@/lib/mock-data';
import { listTasks } from '@/lib/omes-mock';

const REQUIRED_TABLES = {
  tasks: 'Tasks',
  daily: 'Daily Updates',
  issues: 'Issues',
  actions: 'Action Items',
} as const;

export async function GET(req: Request) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: 'WorkBase bootstrap is currently available in mock mode only.' }, { status: 501 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

  const workspace = listWorkspaces()[0] ?? createWorkspace('OMES Workspace', '🏭');
  const baseName = `WorkBase ${projectId.slice(0, 8)}`;

  const existingBase = listBases(workspace.id).find((b) => b.name === baseName);
  const base = existingBase ?? createBase(workspace.id, baseName);

  let baseData = getBaseById(base.id);
  if (!baseData) return NextResponse.json({ error: 'Failed to load WorkBase' }, { status: 500 });

  for (const [key, tableName] of Object.entries(REQUIRED_TABLES)) {
    const found = baseData.tables.find((t) => t.name === tableName);
    if (!found) {
      if (key === 'tasks') {
        createTable(base.id, tableName, true);
      } else {
        createTable(base.id, tableName);
      }
    }
  }

  baseData = getBaseById(base.id);
  if (!baseData) return NextResponse.json({ error: 'Failed to load WorkBase' }, { status: 500 });

  // Hydrate existing project tasks into WorkBase task table (idempotent via _taskId field)
  const tasksTable = baseData.tables.find((t) => t.name === 'Tasks');
  if (tasksTable) {
    const taskIdFieldId = ensureTaskIdField(tasksTable.id);
    const projectTasks = listTasks(projectId);
    for (const task of projectTasks) {
      upsertWorkBaseTaskRecord(tasksTable.id, taskIdFieldId, {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        note: task.note,
      });
    }
  }

  const tablesByKey = Object.fromEntries(
    Object.entries(REQUIRED_TABLES).map(([key, tableName]) => {
      const table = baseData.tables.find((t) => t.name === tableName);
      return [key, { id: table?.id ?? '', name: tableName }];
    })
  );

  return NextResponse.json({
    data: {
      projectId,
      baseId: base.id,
      tables: tablesByKey,
    },
  });
}
