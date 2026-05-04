import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createView, isSupabaseConfigured, listViews } from '@/lib/mock-data';

// GET /api/views?table_id=xxx
export async function GET(req: Request) {
  const table_id = new URL(req.url).searchParams.get('table_id');
  if (!table_id) return NextResponse.json({ error: 'table_id required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: listViews(table_id), mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('views')
    .select('*')
    .eq('table_id', table_id ?? '')
    .order('position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/views
export async function POST(req: Request) {
  const { table_id, name, type = 'table' } = await req.json();
  if (!table_id || !name)
    return NextResponse.json({ error: 'table_id and name required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: createView(table_id, name, type), mode: 'mock' }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase
    .from('views')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', table_id);

  const { data, error } = await supabase
    .from('views')
    .insert({
      table_id, name, type,
      position: count ?? 0,
      config: {
        filters: { logic: 'AND', conditions: [] },
        sorts: [],
        groupByFieldId: null,
        hiddenFields: [],
        columnWidths: {},
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
