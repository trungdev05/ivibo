import { NextResponse } from 'next/server';

const MOCK_REQUESTS = [
  {
    id: 'apr-1',
    title: 'PO-2026-002: Phần mềm bản quyền Microsoft 365',
    type: 'purchase_order',
    requestedBy: 'Ms Trang',
    requestedAt: '2026-04-22T14:30:00.000Z',
    dueDate: '2026-05-02T00:00:00.000Z',
    status: 'pending',
    amount: 12000000,
  },
  {
    id: 'apr-2',
    title: 'Nghỉ phép 3 ngày 5-7/5/2026',
    type: 'leave_request',
    requestedBy: 'Mr Khoa',
    requestedAt: '2026-04-28T10:00:00.000Z',
    dueDate: '2026-05-03T00:00:00.000Z',
    status: 'pending',
  },
  {
    id: 'apr-3',
    title: 'Kế hoạch dự án ERP Giai đoạn 2',
    type: 'project_plan',
    requestedBy: 'Mr Dũng',
    requestedAt: '2026-04-15T09:00:00.000Z',
    status: 'approved',
  },
  {
    id: 'apr-4',
    title: 'Ngân sách đào tạo Q3/2026',
    type: 'budget',
    requestedBy: 'Ms Vy',
    requestedAt: '2026-04-10T11:00:00.000Z',
    status: 'rejected',
    amount: 50000000,
  },
];

export async function GET() {
  return NextResponse.json({ requests: MOCK_REQUESTS });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, action } = body; // action: 'approve' | 'reject'
  // TODO: update DB
  return NextResponse.json({
    id,
    status: action === 'approve' ? 'approved' : 'rejected',
    updatedAt: new Date().toISOString(),
  });
}
