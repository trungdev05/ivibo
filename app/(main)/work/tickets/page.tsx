import { Suspense } from 'react';
import { MyTicketsPage } from '@/components/omes/my-tickets-page';

export default function OmesMyTicketsRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Đang tải...</div>}>
      <MyTicketsPage />
    </Suspense>
  );
}
