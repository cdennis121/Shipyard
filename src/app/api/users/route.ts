import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { requireAdminUser } from '@/lib/route-auth';
import {
  createUserSchema,
  getValidationError,
} from '@/lib/request-schemas';
import { getPlatformLimits } from '@/lib/platform-settings';

// GET - List all users
export async function GET() {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
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

    const hydratedUsers = users.map((user) => ({
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

    return NextResponse.json(hydratedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { username, password, role } = parsed.data;

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
