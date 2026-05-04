import { NextResponse } from 'next/server';
import { isSupabaseConfigured, updateField } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/fields/[id] — update field name / type / options / position
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const patch = await req.json() as Record<string, unknown>;

  if (!isSupabaseConfigured()) {
    const data = updateField(id, patch);
    if (!data) return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('fields')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
