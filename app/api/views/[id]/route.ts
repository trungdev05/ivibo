import { NextResponse } from 'next/server';
import { isSupabaseConfigured, updateView } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/views/[id] — update view config (column widths, filters, sorts, etc.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    const updated = updateView(id, body);
    if (!updated) return NextResponse.json({ error: 'View not found' }, { status: 404 });
    return NextResponse.json({ data: updated, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('views')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
