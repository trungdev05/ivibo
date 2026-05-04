import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';
import { listProjectComments, addProjectComment } from '@/lib/omes-mock';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = listProjectComments(id);
  return NextResponse.json({ data: comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const content: string = (body.content ?? '').trim();
  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

  const mentionUserIds: string[] = Array.isArray(body.mentionUserIds) ? body.mentionUserIds : [];

  const comment = addProjectComment({
    projectId: id,
    authorId: user.id,
    authorName: user.name,
    content,
    mentionUserIds,
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}
