import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOmesUser } from '@/lib/server-identity';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  const user = await getCurrentOmesUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll('files').filter((v) => v instanceof File) as File[];
  if (files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });

  const day = new Date().toISOString().slice(0, 10);
  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'task-comments', day);
  await fs.mkdir(targetDir, { recursive: true });

  const uploaded: Array<{ id: string; url: string; fileName: string; mimeType: string; size: number }> = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: `Unsupported mime type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
    }

    const ext = path.extname(file.name) || '.bin';
    const safeName = sanitize(path.basename(file.name, ext));
    const id = randomUUID();
    const outName = `${id}-${safeName}${ext}`;
    const outPath = path.join(targetDir, outName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(outPath, bytes);

    uploaded.push({
      id,
      url: `/uploads/task-comments/${day}/${outName}`,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
  }

  return NextResponse.json({ data: uploaded }, { status: 201 });
}
