import { NextResponse } from 'next/server';
import type { Prisma, User } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export type CurrentUser = User & {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
};

type RouteAuthResult =
  | { user: CurrentUser }
  | { response: NextResponse };

function isPlatformAdmin(user: Pick<User, 'role'>) {
  return user.role === 'platform_admin';
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  if (session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (user) {
      return user;
    }
  }

  if (session.user.name && session.user.tenantSlug) {
    return prisma.user.findFirst({
      where: {
        username: session.user.name,
        tenant: {
          slug: session.user.tenantSlug,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
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

  if (!['platform_admin', 'admin'].includes(authResult.user.role)) {
    return {
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

export async function requirePlatformAdminUser(): Promise<RouteAuthResult> {
  const authResult = await requireAuthenticatedUser();

  if ('response' in authResult) {
    return authResult;
  }

  if (!isPlatformAdmin(authResult.user)) {
    return {
      response: NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

export function scopeToTenant<T extends Prisma.AppWhereInput>(
  user: CurrentUser,
  where: T = {} as T
): T {
  if (isPlatformAdmin(user)) {
    return where;
  }

  return {
    ...where,
    tenantId: user.tenantId,
  };
}

export async function findTenantAppOrResponse(appId: string, user: CurrentUser) {
  const app = await prisma.app.findFirst({
    where: scopeToTenant(user, { id: appId }),
  });

  if (!app) {
    return {
      response: NextResponse.json({ error: 'App not found' }, { status: 404 }),
    };
  }

  return { app };
}

export async function findTenantReleaseOrResponse(
  releaseId: string,
  user: CurrentUser,
  options?: Prisma.ReleaseFindFirstArgs
) {
  const release = await prisma.release.findFirst({
    ...options,
    where: {
      ...(options?.where ?? {}),
      id: releaseId,
      ...(isPlatformAdmin(user) ? {} : { app: { tenantId: user.tenantId } }),
    },
  });

  if (!release) {
    return {
      response: NextResponse.json({ error: 'Release not found' }, { status: 404 }),
    };
  }

  return { release };
}

export async function findTenantApiKeyOrResponse(keyId: string, user: CurrentUser) {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: keyId,
      ...(isPlatformAdmin(user) ? {} : { app: { tenantId: user.tenantId } }),
    },
  });

  if (!apiKey) {
    return {
      response: NextResponse.json({ error: 'API key not found' }, { status: 404 }),
    };
  }

  return { apiKey };
}
