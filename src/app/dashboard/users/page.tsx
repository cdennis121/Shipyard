import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { UsersClient } from '@/components/UsersClient';
import { getPlatformLimits } from '@/lib/platform-settings';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getUsers() {
  const limits = await getPlatformLimits();
  const [users, appReleaseCounts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            apps: true,
            apiKeys: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.app.findMany({
      select: {
        createdById: true,
        _count: {
          select: {
            releases: true,
          },
        },
      },
    }),
  ]);

  const releaseTotalsByUser = appReleaseCounts.reduce<Record<string, number>>(
    (totals, app) => {
      totals[app.createdById] = (totals[app.createdById] ?? 0) + app._count.releases;
      return totals;
    },
    {}
  );

  return users.map((user) => ({
    ...user,
    usage: {
      apps: user._count.apps,
      releases: releaseTotalsByUser[user.id] ?? 0,
      apiKeys: user._count.apiKeys,
      appLimit: user.role === 'admin' ? null : limits.maxAppsPerUser,
      releaseLimitPerApp:
        user.role === 'admin' ? null : limits.maxReleasesPerApp,
    },
  }));
}

export default async function UsersPage() {
  const session = await auth();
  
  if (session?.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Supervise tenant accounts, quotas, and platform admins
        </p>
      </div>

      <UsersClient users={users} currentUserId={session.user.id} />
    </div>
  );
}
