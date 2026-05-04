import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createTable, deleteTable, getTableBundle, isSupabaseConfigured, updateTable } from '@/lib/mock-data';

// GET /api/tables/[id]  — returns table with fields, views, paginated records+cells
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(Math.max(1, Number(searchParams.get('limit') ?? 50)), 500);

  if (!isSupabaseConfigured()) {
    const data = getTableBundle(id, page, limit);
    if (!data) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const from = (page - 1) * limit;

  const [tableRes, fieldsRes, viewsRes, recordsRes] = await Promise.all([
    supabase.from('tables').select('*').eq('id', id).single(),
    supabase.from('fields').select('*').eq('table_id', id).order('position'),
    supabase.from('views').select('*').eq('table_id', id).order('position'),
    supabase
      .from('records')
      .select('*, cells(*)')
      .eq('table_id', id)
      .order('position')
      .range(from, from + limit - 1),
  ]);

  if (tableRes.error) return NextResponse.json({ error: tableRes.error.message }, { status: 404 });

  // Denormalise cells into record.cells map
  const rows = (recordsRes.data ?? []).map((rec) => {
    const cells: Record<string, unknown> = {};
    for (const cell of rec.cells ?? []) {
      cells[cell.field_id] = cell.value;
    }
    return { id: rec.id, table_id: rec.table_id, position: rec.position, created_at: rec.created_at, created_by: rec.created_by, cells };
  });

  return NextResponse.json({
    data: {
      table: tableRes.data,
      fields: fieldsRes.data ?? [],
      views: viewsRes.data ?? [],
      records: rows,
    },
  });
}

// POST /api/tables — create table inside a base
export async function POST(req: Request) {
  const { base_id, name } = await req.json();
  if (!base_id || !name)
    return NextResponse.json({ error: 'base_id and name required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const data = createTable(base_id, name);
    return NextResponse.json({ data, mode: 'mock' }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get next position
  const { count } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('base_id', base_id);

  const { data: table, error } = await supabase
    .from('tables')
    .insert({ base_id, name, position: count ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Default fields
  await supabase.from('fields').insert([
    { table_id: table.id, name: 'Name', type: 'text', position: 0, is_primary: true },
    { table_id: table.id, name: 'Notes', type: 'text', position: 1 },
  ]);
  // Default view
  await supabase.from('views').insert({
    table_id: table.id, name: 'Grid View', type: 'table', position: 0,
    config: { filters: { logic: 'AND', conditions: [] }, sorts: [], groupByFieldId: null, hiddenFields: [], columnWidths: {} },
  });

  return NextResponse.json({ data: table }, { status: 201 });
}

// PATCH /api/tables/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    const data = updateTable(id, body ?? {});
    if (!data) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tables')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/tables/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    const deleted = deleteTable(id);
    if (!deleted) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
