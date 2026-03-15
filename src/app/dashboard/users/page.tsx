import { getCurrentUser } from '@/lib/route-auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { UsersClient } from '@/components/UsersClient';

async function getUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      _count: {
        select: { apiKeys: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function UsersPage() {
  const user = await getCurrentUser();
  
  if (!user || !['admin', 'platform_admin'].includes(user.role)) {
    redirect('/dashboard');
  }

  const users = await getUsers(user.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage users for {user.tenant.name}
        </p>
      </div>

      <UsersClient users={users} currentUserId={user.id} />
    </div>
  );
}
