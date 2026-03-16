import { NextResponse } from 'next/server';
import type { User } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { canManageTenant } from '@/lib/tenant-access';

type RouteAuthResult =
  | { user: User }
  | { response: NextResponse };

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  if (session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.isActive) {
      return user;
    }
  }

  if (session.user.name) {
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
    });

    return user?.isActive ? user : null;
  }

  return null;
}

export async function requireAuthenticatedUser(): Promise<RouteAuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user };
}

export async function requireAdminUser(): Promise<RouteAuthResult> {
  const authResult = await requireAuthenticatedUser();

  if ('response' in authResult) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return {
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

export async function requireTenantManagerUser(): Promise<RouteAuthResult> {
  const authResult = await requireAuthenticatedUser();

  if ('response' in authResult) {
    return authResult;
  }

  if (!canManageTenant(authResult.user)) {
    return {
      response: NextResponse.json(
        { error: 'Account does not have app management access' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}
