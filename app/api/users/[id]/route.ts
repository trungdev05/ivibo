import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import {
  getUserById,
  upsertUser,
  deleteUser,
  getUserModuleOverrides,
  getProjectsForUser,
} from '@/lib/omes-mock';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const user = getUserById(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const overrides = getUserModuleOverrides(id);
  const projects = getProjectsForUser(id);
  return NextResponse.json({ data: { ...user, moduleOverrides: overrides, projects } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'manage_all')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const existing = getUserById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const updated = upsertUser({ ...existing, ...body, id });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'manage_all')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const ok = deleteUser(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
