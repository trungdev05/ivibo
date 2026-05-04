import { NextResponse } from 'next/server';
import { deleteRecord, isSupabaseConfigured, updateRecordCells } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/records/[id] — update cells { cells: Record<fieldId, value> }
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { cells = {} } = await req.json() as { cells: Record<string, unknown> };

  if (!isSupabaseConfigured()) {
    const data = updateRecordCells(id, cells);
    if (!data) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cellRows = Object.entries(cells).map(([field_id, value]) => ({
    record_id: id,
    field_id,
    value,
  }));

  if (cellRows.length) {
    const { error } = await supabase
      .from('cells')
      .upsert(cellRows, { onConflict: 'record_id,field_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id, cells } });
}

// DELETE /api/records/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    deleteRecord(id);
    return NextResponse.json({ success: true, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('cells').delete().eq('record_id', id);
  await supabase.from('records').delete().eq('id', id);

  return NextResponse.json({ success: true });
}
