import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  requireAdminUser,
  requireAuthenticatedUser,
} from '@/lib/route-auth';
import {
  createAppSchema,
  getValidationError,
} from '@/lib/request-schemas';

export const dynamic = 'force-dynamic';

// GET /api/apps - List all apps
export async function GET() {
  try {
    const authResult = await requireAuthenticatedUser();
    if ('response' in authResult) {
      return authResult.response;
    }

    const apps = await prisma.app.findMany({
      orderBy: { name: 'asc' },
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

    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/apps - Create a new app
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminUser();
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const body = await request.json().catch(() => null);
    const parsed = createAppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { name, slug, description, icon } = parsed.data;

    // Check if slug already exists
    const existingApp = await prisma.app.findUnique({
      where: { slug },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: 'An app with this slug already exists' },
        { status: 400 }
      );
    }

    const app = await prisma.app.create({
      data: {
        name,
        slug,
        description,
        icon,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { username: true },
        },
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    console.error('Error creating app:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
