'use client';
import { Sidebar } from '@/components/layout/sidebar';
import TopBar from '@/components/omes/top-bar';

export default function OmesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
