import { NextRequest, NextResponse } from 'next/server';
import { OMES_ACTIVITY_ACTIONS, OMES_ACTIVITY_MODULES } from '@/lib/omes-labels';
import { listActivityLog, listIssues } from '@/lib/omes-mock';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userLog = listActivityLog(id);
  // Also include issues as activity entries (seeded)
  const issues = listIssues().filter((i: { projectId: string }) => i.projectId === id);
  const issueEntries = issues.map((i: { id: string; reporter: string; issueCode: string; description: string; createdDate: string; status: string; countermeasure: string }) => ({
    id: `iss-${i.id}`,
    projectId: id,
    actor: i.reporter,
    action: OMES_ACTIVITY_ACTIONS.ticket.create(i.issueCode),
    module: OMES_ACTIVITY_MODULES.ticket,
    entity: i.description,
    timestamp: i.createdDate.slice(0, 10),
    status: i.status,
    notes: i.countermeasure || '',
  }));
  const merged = [...userLog, ...issueEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return NextResponse.json({ data: merged });
}
