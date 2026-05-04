import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { deleteBase, getBaseById, updateBase } from '@/lib/mock-data';

type Params = { params: Promise<{ id: string }> };

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    const data = getBaseById(id);
    if (!data) return NextResponse.json({ error: 'Base not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bases')
    .select('*, tables(*, fields(*), views(*))')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    const data = updateBase(id, body ?? {});
    if (!data) return NextResponse.json({ error: 'Base not found' }, { status: 404 });
    return NextResponse.json({ data, mode: 'mock' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bases')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    const deleted = deleteBase(id);
    if (!deleted) return NextResponse.json({ error: 'Base not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('bases').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
