import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { UsersClient } from '@/components/UsersClient';

async function getUsers() {
  return prisma.user.findMany({
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
          Manage admin users for the update server
        </p>
      </div>

      <UsersClient users={users} currentUserId={session.user.id} />
    </div>
  );
}
