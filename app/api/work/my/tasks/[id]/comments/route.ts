import { NextRequest, NextResponse } from 'next/server';
import {
  addTaskCommentById,
  createMentionNotifications,
  extractMentionedUserIds,
  listTaskCommentsById,
  listMyTasks,
} from '@/lib/omes-mock';
import { getCurrentOmesUser } from '@/lib/server-identity';

type IncomingAttachment = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const myTasks = listMyTasks(user.fullName);
  const myTask = myTasks.find((t) => t.id === id);
  
  const data = listTaskCommentsById(id);
  const isMentioned = data.some((c) => c.mentionUserIds?.includes(user.id));
  
  if (!myTask && !isMentioned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const myTask = listMyTasks(user.fullName).find((t) => t.id === id);
  if (!myTask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { content?: string; mentionUserIds?: string[]; attachments?: IncomingAttachment[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  const mentionFromText = extractMentionedUserIds(content);
  const mentionUserIds = Array.from(new Set([...(body.mentionUserIds ?? []), ...mentionFromText]));

  const saved = addTaskCommentById({
    taskId: id,
    authorId: user.id,
    authorName: user.fullName,
    content,
    mentionUserIds,
    attachments: (body.attachments ?? []).filter((a) => !!a?.url && !!a?.fileName && !!a?.mimeType),
  });

  if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  createMentionNotifications({
    actorName: user.fullName,
    actorId: user.id,
    taskId: id,
    taskCode: saved.taskCode,
    taskTitle: saved.title,
    projectId: saved.projectId,
    content,
    mentionedUserIds: mentionUserIds,
  });

  return NextResponse.json({ data: saved.comment }, { status: 201 });
}
