import { NextRequest, NextResponse } from 'next/server';

// In-memory store for per-record field change history
// Updated by the PATCH /api/records/[id] route via a shared module in production
// For now returns an empty list — history is tracked when cells are patched
const _recordHistory: Map<string, Array<{
  id: string; recordId: string; fieldId: string; fieldName: string;
  actor: string; oldValue: string; newValue: string; timestamp: string;
}>> = new Map();

// Export so PATCH route can append history entries
export function appendRecordHistory(entry: {
  recordId: string; fieldId: string; fieldName: string;
  actor: string; oldValue: string; newValue: string;
}) {
  const list = _recordHistory.get(entry.recordId) ?? [];
  list.push({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  _recordHistory.set(entry.recordId, list);
}

type Params = { params: Promise<{ id: string; recordId: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { recordId } = await params;
  const history = (_recordHistory.get(recordId) ?? [])
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return NextResponse.json({ data: history });
}
