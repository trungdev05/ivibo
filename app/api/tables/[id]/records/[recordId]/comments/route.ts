import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';

// In-memory store for record comments (keyed by recordId)
// In production this would be a DB table
const _recordComments: Map<string, Array<{
  id: string; recordId: string; tableId: string;
  authorId: string; authorName: string; content: string;
  attachments: { name: string; url: string; type: string }[];
  mentionUserIds: string[];
  createdAt: string;
}>> = new Map();

type Params = { params: Promise<{ id: string; recordId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { recordId } = await params;
  const comments = (_recordComments.get(recordId) ?? [])
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json({ data: comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: tableId, recordId } = await params;
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const content: string = (body.content ?? '').trim();
  const attachments: { name: string; url: string; type: string }[] = Array.isArray(body.attachments) ? body.attachments : [];
  const mentionUserIds: string[] = Array.isArray(body.mentionUserIds) ? body.mentionUserIds : [];
  if (!content && attachments.length === 0) return NextResponse.json({ error: 'Content or attachment required' }, { status: 400 });

  const comment = {
    id: crypto.randomUUID(),
    recordId,
    tableId,
    authorId: user.id,
    authorName: user.name,
    content,
    attachments,
    mentionUserIds,
    createdAt: new Date().toISOString(),
  };

  const list = _recordComments.get(recordId) ?? [];
  list.push(comment);
  _recordComments.set(recordId, list);

  return NextResponse.json({ data: comment }, { status: 201 });
}
