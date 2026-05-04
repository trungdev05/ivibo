import { NextResponse } from 'next/server';

const MOCK_EVENTS = [
  {
    id: 'sch-1',
    title: 'Standup hàng ngày',
    type: 'meeting',
    date: new Date(Date.now()).toISOString().slice(0, 10),
    start: '09:00',
    end: '09:15',
    user: 'all',
  },
  {
    id: 'sch-2',
    title: 'Làm việc',
    type: 'work',
    date: new Date(Date.now()).toISOString().slice(0, 10),
    start: '08:00',
    end: '17:00',
    user: 'u1',
  },
  {
    id: 'sch-3',
    title: 'Nghỉ phép',
    type: 'leave',
    date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    start: '08:00',
    end: '17:00',
    user: 'u3',
  },
  {
    id: 'sch-4',
    title: 'Demo sprint review',
    type: 'meeting',
    date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    start: '14:00',
    end: '15:30',
    user: 'all',
  },
  {
    id: 'sch-5',
    title: 'Tăng ca release v2',
    type: 'overtime',
    date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    start: '18:00',
    end: '21:00',
    user: 'u2',
  },
];

export async function GET() {
  return NextResponse.json({ events: MOCK_EVENTS });
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ event: { id: crypto.randomUUID(), ...body } }, { status: 201 });
}
