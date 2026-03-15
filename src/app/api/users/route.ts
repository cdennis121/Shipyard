import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { requireAdminUser } from '@/lib/route-auth';
import {
  createUserSchema,
  getValidationError,
} from '@/lib/request-schemas';

// GET - List all users
export async function GET() {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user: currentUser } = authResult;

  try {
    const users = await prisma.user.findMany({
      where: { tenantId: currentUser.tenantId },
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

    return NextResponse.json(users);
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
  const { user: currentUser } = authResult;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { username, password, role } = parsed.data;

    if (role === 'platform_admin' && currentUser.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Only platform admins can create platform admins' },
        { status: 403 }
      );
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: {
        tenantId_username: {
          tenantId: currentUser.tenantId,
          username,
        },
      },
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
        tenantId: currentUser.tenantId,
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        role: true,
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
