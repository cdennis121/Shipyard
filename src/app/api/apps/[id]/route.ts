import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  requireAuthenticatedUser,
  requireTenantManagerUser,
} from '@/lib/route-auth';
import {
  getValidationError,
  updateAppSchema,
} from '@/lib/request-schemas';
import { getAppAccessWhere } from '@/lib/tenant-access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/apps/[id] - Get a single app
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser();
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const { id } = await params;

    const app = await prisma.app.findFirst({
      where: {
        id,
        ...getAppAccessWhere(user),
      },
      include: {
        createdBy: {
          select: { username: true },
        },
        _count: {
          select: {
            releases: true,
            downloadStats: { where: { type: 'download' } },
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error) {
    console.error('Error fetching app:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/apps/[id] - Update an app
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireTenantManagerUser();
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateAppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { name, description, icon } = parsed.data;

    const existingApp = await prisma.app.findFirst({
      where: {
        id,
        ...getAppAccessWhere(user),
      },
      select: { id: true },
    });

    if (!existingApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const app = await prisma.app.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      },
      include: {
        createdBy: {
          select: { username: true },
        },
      },
    });

    return NextResponse.json(app);
  } catch (error) {
    console.error('Error updating app:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/apps/[id] - Delete an app
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireTenantManagerUser();
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const { id } = await params;

    const existingApp = await prisma.app.findFirst({
      where: {
        id,
        ...getAppAccessWhere(user),
      },
      select: { id: true },
    });

    if (!existingApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Delete app (cascades to releases, files, etc.)
    await prisma.app.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting app:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
