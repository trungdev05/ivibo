import { Suspense } from 'react';
import { WorkManagementPage } from '@/components/omes/work-management-page';

export default function OmesWorkRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Đang tải...</div>}>
      <WorkManagementPage />
    </Suspense>
  );
}
