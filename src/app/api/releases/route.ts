import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  requireAuthenticatedUser,
  requireTenantManagerUser,
} from '@/lib/route-auth';
import {
  createReleaseSchema,
  getValidationError,
} from '@/lib/request-schemas';
import {
  getReleaseAccessWhere,
  isAdminUser,
} from '@/lib/tenant-access';
import { getPlatformLimits } from '@/lib/platform-settings';

// GET - List all releases
export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const searchParams = request.nextUrl.searchParams;
  const channel = searchParams.get('channel');
  const platform = searchParams.get('platform');
  const appId = searchParams.get('appId');

  try {
    const releases = await prisma.release.findMany({
      where: {
        ...getReleaseAccessWhere(user),
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
  const authResult = await requireTenantManagerUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createReleaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const {
      appId,
      version,
      name,
      notes,
      channel,
      platform,
      stagingPercentage,
      isPublic,
      published,
    } = parsed.data;

    // Verify app exists
    const app = await prisma.app.findFirst({
      where: isAdminUser(user)
        ? { id: appId }
        : { id: appId, createdById: user.id },
    });
    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    if (!isAdminUser(user)) {
      const limits = await getPlatformLimits();
      const releaseCount = await prisma.release.count({
        where: { appId },
      });

      if (releaseCount >= limits.maxReleasesPerApp) {
        return NextResponse.json(
          {
            error: `Free accounts can publish up to ${limits.maxReleasesPerApp} releases per app`,
          },
          { status: 403 }
        );
      }
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
