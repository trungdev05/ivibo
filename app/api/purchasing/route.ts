import { NextResponse } from 'next/server';

const MOCK_ORDERS = [
  {
    id: 'po-1',
    code: 'PO-2026-001',
    title: 'Mua thiết bị máy tính cho dự án ERP',
    vendor: 'Dell Vietnam',
    amount: 45000000,
    currency: 'VND',
    status: 'approved',
    requestedBy: 'Mr Dũng',
    requestedAt: '2026-04-10T09:00:00.000Z',
  },
  {
    id: 'po-2',
    code: 'PO-2026-002',
    title: 'Phần mềm bản quyền Microsoft 365',
    vendor: 'Microsoft Vietnam',
    amount: 12000000,
    currency: 'VND',
    status: 'pending_approval',
    requestedBy: 'Ms Trang',
    requestedAt: '2026-04-22T14:30:00.000Z',
  },
  {
    id: 'po-3',
    code: 'PO-2026-003',
    title: 'Dịch vụ cloud hosting Q3/2026',
    vendor: 'AWS Vietnam',
    amount: 8500000,
    currency: 'VND',
    status: 'draft',
    requestedBy: 'Mr Khoa',
    requestedAt: '2026-04-28T10:00:00.000Z',
  },
];

export async function GET() {
  return NextResponse.json({ orders: MOCK_ORDERS });
}

export async function POST(req: Request) {
  const body = await req.json();
  const order = {
    id: crypto.randomUUID(),
    code: `PO-2026-${String(MOCK_ORDERS.length + 1).padStart(3, '0')}`,
    status: 'draft',
    requestedAt: new Date().toISOString(),
    ...body,
  };
  return NextResponse.json({ order }, { status: 201 });
}
