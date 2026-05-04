import { randomUUID } from 'crypto';

type Workspace = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

type Base = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type Table = {
  id: string;
  base_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type Field = {
  id: string;
  table_id: string;
  name: string;
  type: string;
  options: Record<string, unknown>;
  position: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

type View = {
  id: string;
  table_id: string;
  name: string;
  type: 'table' | 'kanban' | 'gallery';
  config: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
};

type RecordRow = {
  id: string;
  table_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type Cell = {
  id: string;
  record_id: string;
  field_id: string;
  value: unknown;
  updated_at: string;
};

type MockDb = {
  workspaces: Workspace[];
  bases: Base[];
  tables: Table[];
  fields: Field[];
  views: View[];
  records: RecordRow[];
  cells: Cell[];
};

function nowIso() {
  return new Date().toISOString();
}

function defaultViewConfig() {
  return {
    filters: { logic: 'AND', conditions: [] },
    sorts: [],
    groupByFieldId: null,
    hiddenFields: [],
    columnWidths: {},
  };
}

function getDb(): MockDb {
  const g = globalThis as unknown as { __mockDb?: Partial<MockDb> };
  if (!g.__mockDb) {
    g.__mockDb = {
      workspaces: [],
      bases: [],
      tables: [],
      fields: [],
      views: [],
      records: [],
      cells: [],
    };
  } else {
    g.__mockDb.workspaces = g.__mockDb.workspaces ?? [];
    g.__mockDb.bases = g.__mockDb.bases ?? [];
    g.__mockDb.tables = g.__mockDb.tables ?? [];
    g.__mockDb.fields = g.__mockDb.fields ?? [];
    g.__mockDb.views = g.__mockDb.views ?? [];
    g.__mockDb.records = g.__mockDb.records ?? [];
    g.__mockDb.cells = g.__mockDb.cells ?? [];
  }
  return g.__mockDb as MockDb;
}

function removeTableCascade(tableId: string) {
  const db = getDb();
  const fieldIds = db.fields.filter((f) => f.table_id === tableId).map((f) => f.id);
  const recordIds = db.records.filter((r) => r.table_id === tableId).map((r) => r.id);

  db.cells = db.cells.filter((c) => !fieldIds.includes(c.field_id) && !recordIds.includes(c.record_id));
  db.fields = db.fields.filter((f) => f.table_id !== tableId);
  db.views = db.views.filter((v) => v.table_id !== tableId);
  db.records = db.records.filter((r) => r.table_id !== tableId);
  db.tables = db.tables.filter((t) => t.id !== tableId);
}

function createDefaultTableContent(tableId: string) {
  const db = getDb();

  const fieldName: Field = {
    id: randomUUID(),
    table_id: tableId,
    name: 'Tên',
    type: 'text',
    options: {},
    position: 0,
    is_primary: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const fieldStatus: Field = {
    id: randomUUID(),
    table_id: tableId,
    name: 'Trạng thái',
    type: 'select',
    options: {
      choices: [
        { id: 'todo', name: 'Cần làm', color: 'bg-gray-100 text-gray-700' },
        { id: 'in_progress', name: 'Đang làm', color: 'bg-blue-100 text-blue-700' },
        { id: 'done', name: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
      ],
    },
    position: 1,
    is_primary: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  db.fields.push(fieldName, fieldStatus);

  const gridView: View = {
    id: randomUUID(),
    table_id: tableId,
    name: 'Bảng dữ liệu',
    type: 'table',
    config: defaultViewConfig(),
    position: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const kanbanView: View = {
    id: randomUUID(),
    table_id: tableId,
    name: 'Kanban',
    type: 'kanban',
    config: { ...defaultViewConfig(), groupByFieldId: fieldStatus.id },
    position: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const galleryView: View = {
    id: randomUUID(),
    table_id: tableId,
    name: 'Thư viện',
    type: 'gallery',
    config: defaultViewConfig(),
    position: 2,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  db.views.push(gridView, kanbanView, galleryView);
}

function createTaskTableContent(tableId: string) {
  const db = getDb();

  function makeField(name: string, type: string, options: Record<string, unknown>, position: number, isPrimary = false): Field {
    return { id: randomUUID(), table_id: tableId, name, type, options, position, is_primary: isPrimary, created_at: nowIso(), updated_at: nowIso() };
  }

  db.fields.push(
    makeField('Tên công việc', 'text', {}, 0, true),
    makeField('Trạng thái', 'select', { choices: [
      { id: 'todo', name: 'Cần làm', color: 'bg-gray-100 text-gray-700' },
      { id: 'in_progress', name: 'Đang làm', color: 'bg-blue-100 text-blue-700' },
      { id: 'done', name: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
      { id: 'blocked', name: 'Bị chặn', color: 'bg-red-100 text-red-700' },
      { id: 'cancelled', name: 'Đã hủy', color: 'bg-gray-100 text-gray-500' },
    ]}, 1),
    makeField('Độ ưu tiên', 'select', { choices: [
      { id: 'critical', name: 'Khẩn cấp', color: 'bg-red-100 text-red-700' },
      { id: 'high', name: 'Cao', color: 'bg-orange-100 text-orange-700' },
      { id: 'medium', name: 'Trung bình', color: 'bg-yellow-100 text-yellow-700' },
      { id: 'low', name: 'Thấp', color: 'bg-gray-100 text-gray-600' },
    ]}, 2),
    makeField('Người thực hiện', 'text', {}, 3),
    makeField('Ngày bắt đầu', 'date', {}, 4),
    makeField('Ngày kết thúc', 'date', {}, 5),
    makeField('Ước tính (giờ)', 'number', {}, 6),
    makeField('Thực tế (giờ)', 'number', {}, 7),
    makeField('Mã yêu cầu', 'text', {}, 8),
    makeField('Cột mốc', 'text', {}, 9),
    makeField('Ghi chú', 'text', {}, 10),
    makeField('_taskId', 'text', {}, 11),
  );

  const statusField = db.fields.find((f) => f.table_id === tableId && f.type === 'select');
  const gridView: View = { id: randomUUID(), table_id: tableId, name: 'Bảng dữ liệu', type: 'table', config: defaultViewConfig(), position: 0, created_at: nowIso(), updated_at: nowIso() };
  const kanbanView: View = { id: randomUUID(), table_id: tableId, name: 'Kanban', type: 'kanban', config: { ...defaultViewConfig(), groupByFieldId: statusField?.id ?? null }, position: 1, created_at: nowIso(), updated_at: nowIso() };
  db.views.push(gridView, kanbanView);
}

function localizeLegacyTaskSchema(tableId: string) {
  const db = getDb();
  const fieldNameMap: Record<string, string> = {
    'Task Name': 'Tên công việc',
    'Status': 'Trạng thái',
    'Priority': 'Độ ưu tiên',
    'Assignee': 'Người thực hiện',
    'Start Date': 'Ngày bắt đầu',
    'Due Date': 'Ngày kết thúc',
    'Estimate (h)': 'Ước tính (giờ)',
    'Actual (h)': 'Thực tế (giờ)',
    'Requirement ID': 'Mã yêu cầu',
    'Milestone': 'Cột mốc',
    'Notes': 'Ghi chú',
    'Name': 'Tên',
  };
  const optionNameMap: Record<string, string> = {
    'Todo': 'Cần làm',
    'In Progress': 'Đang làm',
    'Done': 'Hoàn thành',
    'Blocked': 'Bị chặn',
    'Cancelled': 'Đã hủy',
    'Critical': 'Khẩn cấp',
    'High': 'Cao',
    'Medium': 'Trung bình',
    'Low': 'Thấp',
  };
  const viewNameMap: Record<string, string> = {
    'Grid View': 'Bảng dữ liệu',
    'Gallery': 'Thư viện',
  };

  db.fields.forEach((f) => {
    if (f.table_id !== tableId) return;
    const mapped = fieldNameMap[f.name];
    if (mapped) f.name = mapped;

    if (f.type === 'select' || f.type === 'multi_select') {
      const choices = (f.options?.choices as Array<{ name?: string }> | undefined) ?? [];
      choices.forEach((c) => {
        if (!c.name) return;
        const m = optionNameMap[c.name];
        if (m) c.name = m;
      });
    }
  });

  db.views.forEach((v) => {
    if (v.table_id !== tableId) return;
    const mapped = viewNameMap[v.name];
    if (mapped) v.name = mapped;
  });
}

export { createTaskTableContent };

// ─── WorkBase ↔ Project Task sync helpers ────────────────────────────────────

/** Ensures the `_taskId` linking field exists on a task table; returns its field ID. */
export function ensureTaskIdField(tableId: string): string {
  const db = getDb();
  let field = db.fields.find((f) => f.table_id === tableId && f.name === '_taskId');
  if (!field) {
    const maxPos = db.fields
      .filter((f) => f.table_id === tableId)
      .reduce((m, f) => Math.max(m, f.position), -1);
    field = {
      id: randomUUID(),
      table_id: tableId,
      name: '_taskId',
      type: 'text',
      options: {},
      position: maxPos + 1,
      is_primary: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.fields.push(field);
  }
  return field.id;
}

/** Returns the task-table ID and the _taskId field ID for a project's WorkBase, or null if not bootstrapped yet. */
export function getProjectWorkBaseTaskTable(projectId: string): { tableId: string; taskIdFieldId: string } | null {
  const db = getDb();
  const baseName = `WorkBase ${projectId.slice(0, 8)}`;
  const base = db.bases.find((b) => b.name === baseName);
  if (!base) return null;
  const table = db.tables.find((t) => t.base_id === base.id && t.name === 'Tasks');
  if (!table) return null;
  const taskIdFieldId = ensureTaskIdField(table.id);
  return { tableId: table.id, taskIdFieldId };
}

interface SyncTaskInput {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  note: string;
}

/** Upserts a WorkBase record in the project's task table to reflect an OmesTask. */
export function upsertWorkBaseTaskRecord(tableId: string, taskIdFieldId: string, task: SyncTaskInput): void {
  const db = getDb();

  const fields = db.fields.filter((f) => f.table_id === tableId);
  const fieldId = (name: string) => fields.find((f) => f.name === name)?.id;

  const statusMap: Record<string, string> = {
    Todo: 'todo', 'In Progress': 'in_progress', Review: 'in_progress',
    Done: 'done', Blocked: 'blocked', Cancelled: 'cancelled',
  };
  const priorityMap: Record<string, string> = {
    Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low',
  };

  // Find or create record
  let record = db.records.find(
    (r) =>
      r.table_id === tableId &&
      db.cells.some((c) => c.record_id === r.id && c.field_id === taskIdFieldId && c.value === task.id)
  ) ?? null;

  if (!record) {
    const position = db.records.filter((r) => r.table_id === tableId).length;
    record = {
      id: randomUUID(),
      table_id: tableId,
      position,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
    };
    db.records.push(record);
  }

  const cells: Record<string, unknown> = {
    [taskIdFieldId]: task.id,
    ...(fieldId('Tên công việc') ? { [fieldId('Tên công việc')!]: task.title } : {}),
    ...(fieldId('Trạng thái') ? { [fieldId('Trạng thái')!]: statusMap[task.status] ?? 'todo' } : {}),
    ...(fieldId('Độ ưu tiên') ? { [fieldId('Độ ưu tiên')!]: priorityMap[task.priority] ?? 'medium' } : {}),
    ...(fieldId('Người thực hiện') ? { [fieldId('Người thực hiện')!]: task.assignee } : {}),
    ...(fieldId('Ngày bắt đầu') ? { [fieldId('Ngày bắt đầu')!]: task.startDate } : {}),
    ...(fieldId('Ngày kết thúc') ? { [fieldId('Ngày kết thúc')!]: task.dueDate } : {}),
    ...(fieldId('Ước tính (giờ)') ? { [fieldId('Ước tính (giờ)')!]: task.estimatedHours } : {}),
    ...(fieldId('Thực tế (giờ)') ? { [fieldId('Thực tế (giờ)')!]: task.actualHours } : {}),
    ...(fieldId('Ghi chú') ? { [fieldId('Ghi chú')!]: task.note } : {}),
  };

  for (const [fId, value] of Object.entries(cells)) {
    const existing = db.cells.find((c) => c.record_id === record!.id && c.field_id === fId);
    if (existing) {
      existing.value = value;
      existing.updated_at = nowIso();
    } else {
      db.cells.push({ id: randomUUID(), record_id: record!.id, field_id: fId, value, updated_at: nowIso() });
    }
  }
  record.updated_at = nowIso();
}

/** Removes the WorkBase record linked to a given task ID. */
export function removeWorkBaseTaskRecord(tableId: string, taskIdFieldId: string, taskId: string): void {
  const db = getDb();
  const record = db.records.find(
    (r) =>
      r.table_id === tableId &&
      db.cells.some((c) => c.record_id === r.id && c.field_id === taskIdFieldId && c.value === taskId)
  );
  if (!record) return;
  db.cells = db.cells.filter((c) => c.record_id !== record.id);
  db.records = db.records.filter((r) => r.id !== record.id);
}


export function listWorkspaces(): Workspace[] {
  return [...getDb().workspaces].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function createWorkspace(name: string, icon = 'WS'): Workspace {
  const db = getDb();
  const record: Workspace = {
    id: randomUUID(),
    name,
    slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`,
    icon,
    owner_id: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.workspaces.push(record);
  return record;
}

export function listBases(workspaceId?: string): Array<Base & { tables: Pick<Table, 'id' | 'name' | 'position'>[] }> {
  const db = getDb();
  const filtered = workspaceId ? db.bases.filter((b) => b.workspace_id === workspaceId) : db.bases;
  return filtered
    .map((b) => ({
      ...b,
      tables: db.tables
        .filter((t) => t.base_id === b.id)
        .map((t) => ({ id: t.id, name: t.name, position: t.position }))
        .sort((a, b2) => a.position - b2.position),
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function createBase(workspaceId: string, name: string, color = '#4F46E5', icon = 'DB') {
  const db = getDb();
  const base: Base = {
    id: randomUUID(),
    workspace_id: workspaceId,
    name,
    color,
    icon,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.bases.push(base);

  const table = createTable(base.id, 'Table 1');

  return { ...base, tables: [{ id: table.id, name: table.name, position: table.position }] };
}

export function getBaseById(baseId: string) {
  const db = getDb();
  const base = db.bases.find((b) => b.id === baseId);
  if (!base) return null;

  const tables = db.tables
    .filter((t) => t.base_id === base.id)
    .map((t) => ({
      ...t,
      fields: db.fields.filter((f) => f.table_id === t.id).sort((a, b) => a.position - b.position),
      views: db.views.filter((v) => v.table_id === t.id).sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  return { ...base, tables };
}

export function updateBase(baseId: string, patch: Partial<Base>) {
  const db = getDb();
  const idx = db.bases.findIndex((b) => b.id === baseId);
  if (idx < 0) return null;
  db.bases[idx] = { ...db.bases[idx], ...patch, updated_at: nowIso() };
  return db.bases[idx];
}

export function deleteBase(baseId: string) {
  const db = getDb();
  const before = db.bases.length;
  const tableIds = db.tables.filter((t) => t.base_id === baseId).map((t) => t.id);
  tableIds.forEach(removeTableCascade);
  db.bases = db.bases.filter((b) => b.id !== baseId);
  return db.bases.length < before;
}

export function createTable(baseId: string, name: string, usePmSchema = false) {
  const db = getDb();
  const position = db.tables.filter((t) => t.base_id === baseId).length;
  const table: Table = {
    id: randomUUID(),
    base_id: baseId,
    name,
    position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.tables.push(table);
  if (usePmSchema) {
    createTaskTableContent(table.id);
  } else {
    createDefaultTableContent(table.id);
  }
  return table;
}

export function getTableBundle(tableId: string, page = 1, limit = 50) {
  const db = getDb();
  const table = db.tables.find((t) => t.id === tableId);
  if (!table) return null;

  // Keep old mock tables consistent with current Vietnamese labels
  localizeLegacyTaskSchema(tableId);

  const fields = db.fields.filter((f) => f.table_id === tableId).sort((a, b) => a.position - b.position);
  const views = db.views.filter((v) => v.table_id === tableId).sort((a, b) => a.position - b.position);

  const allRecords = db.records
    .filter((r) => r.table_id === tableId)
    .sort((a, b) => a.position - b.position);

  const total = allRecords.length;
  const from = (page - 1) * limit;
  const pageRecords = allRecords.slice(from, from + limit);

  const records = pageRecords.map((r) => {
    const cells: Record<string, unknown> = {};
    db.cells
      .filter((c) => c.record_id === r.id)
      .forEach((c) => {
        cells[c.field_id] = c.value;
      });
    return {
      id: r.id,
      table_id: r.table_id,
      position: r.position,
      created_at: r.created_at,
      created_by: r.created_by,
      cells,
    };
  });

  return { table, fields, views, records, total, page, limit };
}

export function updateTable(tableId: string, patch: Partial<Table>) {
  const db = getDb();
  const idx = db.tables.findIndex((t) => t.id === tableId);
  if (idx < 0) return null;
  db.tables[idx] = { ...db.tables[idx], ...patch, updated_at: nowIso() };
  return db.tables[idx];
}

export function deleteTable(tableId: string) {
  const exists = getDb().tables.some((t) => t.id === tableId);
  if (!exists) return false;
  removeTableCascade(tableId);
  return true;
}

export function listFields(tableId: string) {
  return getDb().fields.filter((f) => f.table_id === tableId).sort((a, b) => a.position - b.position);
}

export function createField(tableId: string, name: string, type = 'text', options: Record<string, unknown> = {}) {
  const db = getDb();
  const position = db.fields.filter((f) => f.table_id === tableId).length;
  const field: Field = {
    id: randomUUID(),
    table_id: tableId,
    name,
    type,
    options,
    position,
    is_primary: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.fields.push(field);
  return field;
}

export function updateField(fieldId: string, patch: Partial<Field>) {
  const db = getDb();
  const idx = db.fields.findIndex((f) => f.id === fieldId);
  if (idx < 0) return null;
  db.fields[idx] = { ...db.fields[idx], ...patch, updated_at: nowIso() };
  return db.fields[idx];
}

export function deleteField(fieldId: string) {
  const db = getDb();
  const before = db.fields.length;
  db.fields = db.fields.filter((f) => f.id !== fieldId);
  db.cells = db.cells.filter((c) => c.field_id !== fieldId);
  return db.fields.length < before;
}

export function listViews(tableId: string) {
  return getDb().views.filter((v) => v.table_id === tableId).sort((a, b) => a.position - b.position);
}

export function createView(tableId: string, name: string, type: 'table' | 'kanban' | 'gallery' = 'table') {
  const db = getDb();
  const position = db.views.filter((v) => v.table_id === tableId).length;
  const view: View = {
    id: randomUUID(),
    table_id: tableId,
    name,
    type,
    config: defaultViewConfig(),
    position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.views.push(view);
  return view;
}

export function updateView(viewId: string, patch: Partial<View>) {
  const db = getDb();
  const idx = db.views.findIndex((v) => v.id === viewId);
  if (idx < 0) return null;
  db.views[idx] = { ...db.views[idx], ...patch, updated_at: nowIso() };
  return db.views[idx];
}

export function deleteView(viewId: string) {
  const db = getDb();
  const before = db.views.length;
  db.views = db.views.filter((v) => v.id !== viewId);
  return db.views.length < before;
}

export function createRecord(tableId: string, cells: Record<string, unknown> = {}) {
  const db = getDb();
  const position = db.records.filter((r) => r.table_id === tableId).length;
  const rec: RecordRow = {
    id: randomUUID(),
    table_id: tableId,
    position,
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by: null,
  };
  db.records.push(rec);

  Object.entries(cells).forEach(([fieldId, value]) => {
    db.cells.push({ id: randomUUID(), record_id: rec.id, field_id: fieldId, value, updated_at: nowIso() });
  });

  return {
    ...rec,
    cells,
  };
}

export function updateRecordCells(recordId: string, cells: Record<string, unknown>) {
  const db = getDb();
  const record = db.records.find((r) => r.id === recordId);
  if (!record) return null;

  Object.entries(cells).forEach(([fieldId, value]) => {
    const existing = db.cells.find((c) => c.record_id === recordId && c.field_id === fieldId);
    if (existing) {
      existing.value = value;
      existing.updated_at = nowIso();
    } else {
      db.cells.push({ id: randomUUID(), record_id: recordId, field_id: fieldId, value, updated_at: nowIso() });
    }
  });

  record.updated_at = nowIso();
  return { id: recordId, cells };
}

export function deleteRecord(recordId: string) {
  const db = getDb();
  const before = db.records.length;
  db.records = db.records.filter((r) => r.id !== recordId);
  db.cells = db.cells.filter((c) => c.record_id !== recordId);
  return db.records.length < before;
}

export function deleteRecords(recordIds: string[]) {
  let deletedAny = false;
  recordIds.forEach((id) => {
    deletedAny = deleteRecord(id) || deletedAny;
  });
  return deletedAny;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';
}

/** Bulk-seed N records into a table for performance testing. */
export function seedRecords(tableId: string, count: number) {
  const db = getDb();
  const fields = db.fields.filter((f) => f.table_id === tableId);
  if (!fields.length) return 0;

  const statusField = fields.find((f) => f.type === 'select');
  const statusChoices: string[] = statusField?.options?.choices
    ? (statusField.options.choices as { id: string }[]).map((c) => c.id)
    : [];

  const priorityField = fields.find((f) => f.name.toLowerCase().includes('priority'));
  const priorityChoices: string[] = priorityField?.options?.choices
    ? (priorityField.options.choices as { id: string }[]).map((c) => c.id)
    : [];

  const primaryField = fields.find((f) => f.is_primary) ?? fields[0];
  const basePos = db.records.filter((r) => r.table_id === tableId).length;

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const recId = randomUUID();
    const rec: RecordRow = {
      id: recId,
      table_id: tableId,
      position: basePos + i,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
    };
    db.records.push(rec);

    // Primary field
    db.cells.push({
      id: randomUUID(),
      record_id: recId,
      field_id: primaryField.id,
      value: `Task ${basePos + i + 1}`,
      updated_at: nowIso(),
    });

    // Status
    if (statusField && statusChoices.length) {
      db.cells.push({
        id: randomUUID(),
        record_id: recId,
        field_id: statusField.id,
        value: statusChoices[i % statusChoices.length],
        updated_at: nowIso(),
      });
    }

    // Priority
    if (priorityField && priorityChoices.length) {
      db.cells.push({
        id: randomUUID(),
        record_id: recId,
        field_id: priorityField.id,
        value: priorityChoices[i % priorityChoices.length],
        updated_at: nowIso(),
      });
    }

    // Dates — spread over next 6 months
    const dueDateField = fields.find((f) => f.name.toLowerCase().includes('due'));
    if (dueDateField) {
      const d = new Date(now);
      d.setDate(d.getDate() + (i % 180));
      db.cells.push({
        id: randomUUID(),
        record_id: recId,
        field_id: dueDateField.id,
        value: d.toISOString().slice(0, 10),
        updated_at: nowIso(),
      });
    }
  }

  return count;
}
