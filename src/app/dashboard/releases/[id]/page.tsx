import { ReleaseDetailClient } from '@/components/ReleaseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReleaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return <ReleaseDetailClient releaseId={id} />;
}
