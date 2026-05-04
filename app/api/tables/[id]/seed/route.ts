import { NextResponse } from 'next/server';
import { isSupabaseConfigured, seedRecords } from '@/lib/mock-data';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tables/[id]/seed
 * Body: { count?: number }   default 10 000
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Seed is only available in mock mode' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({})) as { count?: number };
  const count = Math.min(Math.max(Number(body.count ?? 10_000), 1), 50_000);

  const inserted = seedRecords(id, count);
  return NextResponse.json({ inserted, mode: 'mock' });
}
