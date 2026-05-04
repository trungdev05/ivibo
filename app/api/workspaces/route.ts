import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { slugify } from '@/lib/utils';
import { createWorkspace, listWorkspaces } from '@/lib/mock-data';

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';
}

// GET /api/workspaces
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: listWorkspaces(), mode: 'mock' });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*, workspace_members(role)')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/workspaces
export async function POST(req: Request) {
  const body = await req.json();
  const { name, icon = '🏢' } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: createWorkspace(name, icon), mode: 'mock' }, { status: 201 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, slug: slugify(name), icon, owner_id: user?.id ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add owner as member when user is authenticated.
  if (user?.id) {
    await supabase.from('workspace_members').insert({
      workspace_id: data.id,
      user_id: user.id,
      role: 'owner',
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
