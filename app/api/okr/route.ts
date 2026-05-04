import { NextResponse } from 'next/server';

// Mock OKR data — replace with Prisma query in production
const MOCK_OBJECTIVES = [
  {
    id: 'okr-1',
    title: 'Nâng cao chất lượng sản phẩm phần mềm',
    owner: 'Mr Dũng',
    progress: 65,
    status: 'on_track',
    keyResults: [
      { id: 'kr-1', title: 'Giảm bug production xuống < 5 bug/tháng', progress: 80 },
      { id: 'kr-2', title: 'Test coverage đạt 70%', progress: 55 },
      { id: 'kr-3', title: 'Thời gian deploy < 15 phút', progress: 60 },
    ],
  },
  {
    id: 'okr-2',
    title: 'Tăng sự hài lòng của khách hàng',
    owner: 'Ms Trang',
    progress: 40,
    status: 'at_risk',
    keyResults: [
      { id: 'kr-4', title: 'NPS score đạt 7.5+', progress: 50 },
      { id: 'kr-5', title: 'Thời gian phản hồi ticket < 4 giờ', progress: 30 },
    ],
  },
  {
    id: 'okr-3',
    title: 'Cải thiện quy trình triển khai dự án',
    owner: 'Mr Khoa',
    progress: 90,
    status: 'completed',
    keyResults: [
      { id: 'kr-6', title: 'Triển khai CI/CD cho toàn bộ dự án', progress: 100 },
      { id: 'kr-7', title: 'Tài liệu hóa 100% API endpoints', progress: 80 },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ objectives: MOCK_OBJECTIVES });
}

export async function POST(req: Request) {
  const body = await req.json();
  // TODO: persist to DB
  return NextResponse.json({ objective: { id: crypto.randomUUID(), ...body } }, { status: 201 });
}
