import { auth } from '@/lib/auth';
import { AppsClient } from '@/components/AppsClient';
import { getPlatformLimits } from '@/lib/platform-settings';

export const dynamic = 'force-dynamic';

export default async function AppsPage() {
  const session = await auth();
  const limits = await getPlatformLimits();

  return (
    <AppsClient
      currentUserRole={session?.user.role ?? 'viewer'}
      maxAppsPerUser={limits.maxAppsPerUser}
    />
  );
}
