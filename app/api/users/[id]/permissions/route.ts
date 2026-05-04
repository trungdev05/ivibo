import { NextResponse } from 'next/server';
import { can, getRoleFromRequest } from '@/lib/rbac';
import {
  getUserModuleOverrides,
  setUserModuleOverride,
  deleteUserModuleOverride,
} from '@/lib/omes-mock';
import type { ModuleCode } from '@/lib/platform-types';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ data: getUserModuleOverrides(id) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'manage_all')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const override = setUserModuleOverride({ userId: id, ...body });
  return NextResponse.json({ data: override });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(req);
  if (!can(role, 'manage_all')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const moduleCode = searchParams.get('moduleCode') as ModuleCode | null;
  if (!moduleCode) return NextResponse.json({ error: 'moduleCode required' }, { status: 400 });
  deleteUserModuleOverride(id, moduleCode);
  return NextResponse.json({ ok: true });
}
