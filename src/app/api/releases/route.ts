import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - List all releases
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const channel = searchParams.get('channel');
  const platform = searchParams.get('platform');
  const appId = searchParams.get('appId');

  try {
    const releases = await prisma.release.findMany({
      where: {
        ...(appId && { appId }),
        ...(channel && { channel }),
        ...(platform && { platform }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        app: {
          select: { id: true, name: true, slug: true },
        },
        files: true,
        _count: {
          select: { downloadStats: { where: { type: 'download' } } },
        },
      },
    });

    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new release
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      appId,
      version,
      name,
      notes,
      channel = 'latest',
      platform = 'windows',
      stagingPercentage = 100,
      isPublic = true,
      published = false,
    } = body;

    if (!appId) {
      return NextResponse.json(
        { error: 'App ID is required' },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: 'Version is required' },
        { status: 400 }
      );
    }

    // Verify app exists
    const app = await prisma.app.findUnique({ where: { id: appId } });
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Check for duplicate version/channel/platform combination within the app
    const existing = await prisma.release.findUnique({
      where: {
        appId_version_channel_platform: {
          appId,
          version,
          channel,
          platform,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A release with this version, channel, and platform already exists for this app' },
        { status: 409 }
      );
    }

    const release = await prisma.release.create({
      data: {
        appId,
        version,
        name,
        notes,
        channel,
        platform,
        stagingPercentage,
        isPublic,
        published,
      },
      include: {
        app: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    console.error('Error creating release:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
