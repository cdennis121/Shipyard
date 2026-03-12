import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  requireAdminUser,
  requireAuthenticatedUser,
} from '@/lib/route-auth';

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

    const body = await request.json();
    const { name, slug, description, icon } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens (e.g., my-app)' },
        { status: 400 }
      );
    }

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
