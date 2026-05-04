import { notFound } from 'next/navigation';
import UserDetailPage from './user-detail-page';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();
  return <UserDetailPage userId={id} />;
}
