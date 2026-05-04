import { NextResponse } from 'next/server';
import { createRecord, deleteRecords, isSupabaseConfigured } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/server';

// POST /api/records — create a new record
export async function POST(req: Request) {
  const body = await req.json();
  const { table_id, cells = {} } = body as { table_id: string; cells: Record<string, unknown> };
  if (!table_id) return NextResponse.json({ error: 'table_id is required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const data = createRecord(table_id, cells);
    return NextResponse.json({ data, mode: 'mock' }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get next position
  const { count } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', table_id);

  const { data: record, error: recError } = await supabase
    .from('records')
    .insert({ table_id, position: count ?? 0, created_by: user.id })
    .select()
    .single();

  if (recError || !record) {
    return NextResponse.json({ error: recError?.message ?? 'Failed to create record' }, { status: 500 });
  }

  // Upsert cells
  if (Object.keys(cells).length) {
    const cellRows = Object.entries(cells).map(([field_id, value]) => ({
      record_id: record.id,
      field_id,
      value,
    }));
    await supabase.from('cells').upsert(cellRows, { onConflict: 'record_id,field_id' });
  }

  return NextResponse.json({ data: { ...record, cells } }, { status: 201 });
}

// DELETE /api/records — bulk delete { ids: string[] }
export async function DELETE(req: Request) {
  const body = await req.json();
  const ids: string[] = body?.ids ?? [];
  if (!ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    deleteRecords(ids);
    return NextResponse.json({ success: true, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('cells').delete().in('record_id', ids);
  await supabase.from('records').delete().in('id', ids);

  return NextResponse.json({ success: true });
}
