import { NextResponse } from 'next/server';
import { createField, isSupabaseConfigured } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/server';

// POST /api/fields — create a new field
export async function POST(req: Request) {
  const body = await req.json();
  const { table_id, name, type = 'text', options = {} } = body as {
    table_id: string;
    name: string;
    type?: string;
    options?: Record<string, unknown>;
  };

  if (!table_id || !name)
    return NextResponse.json({ error: 'table_id and name are required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const data = createField(table_id, name, type, options);
    return NextResponse.json({ data, mode: 'mock' }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase
    .from('fields')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', table_id);

  const { data, error } = await supabase
    .from('fields')
    .insert({ table_id, name, type, options, position: count ?? 0, is_primary: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
