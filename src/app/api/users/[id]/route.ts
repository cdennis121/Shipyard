import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminUser } from '@/lib/route-auth';
import {
  getValidationError,
  updateUserSchema,
} from '@/lib/request-schemas';

type RouteParams = Promise<{ id: string }>;

// PATCH - Update a user's account status or role
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user: currentUser } = authResult;

  const { id } = await params;

  if (id === currentUser.id) {
    return NextResponse.json(
      { error: 'Cannot modify your own admin account from this screen' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined && { role: parsed.data.role }),
        ...(parsed.data.isActive !== undefined && {
          isActive: parsed.data.isActive,
        }),
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user: currentUser } = authResult;

  const { id } = await params;

  // Prevent self-deletion
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  try {
    const [user, ownedAppsCount, createdApiKeysCount] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id },
      }),
      prisma.app.count({
        where: { createdById: id },
      }),
      prisma.apiKey.count({
        where: { createdById: id },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (ownedAppsCount > 0 || createdApiKeysCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete a user who still owns apps or API keys',
          counts: {
            apps: ownedAppsCount,
            apiKeys: createdApiKeysCount,
          },
        },
        { status: 409 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
