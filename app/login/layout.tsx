import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng nhập — OMES Work Management',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
