import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deleteReleaseFiles } from '@/lib/cleanup';
import {
  requireAdminUser,
  requireAuthenticatedUser,
} from '@/lib/route-auth';

type RouteParams = Promise<{ id: string }>;

// GET - Get single release
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAuthenticatedUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const release = await prisma.release.findUnique({
      where: { id },
      include: {
        files: true,
        app: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            downloadStats: true,
            rolloutTracking: true,
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error fetching release:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update release
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      version,
      name,
      notes,
      channel,
      platform,
      stagingPercentage,
      isPublic,
      published,
    } = body;

    // Check if release exists
    const existing = await prisma.release.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    // If version/channel/platform changed, check for duplicates
    if (version || channel || platform) {
      const checkVersion = version || existing.version;
      const checkChannel = channel || existing.channel;
      const checkPlatform = platform || existing.platform;

      const duplicate = await prisma.release.findUnique({
        where: {
          appId_version_channel_platform: {
            appId: existing.appId,
            version: checkVersion,
            channel: checkChannel,
            platform: checkPlatform,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'A release with this version, channel, and platform already exists' },
          { status: 409 }
        );
      }
    }

    const release = await prisma.release.update({
      where: { id },
      data: {
        ...(version !== undefined && { version }),
        ...(name !== undefined && { name }),
        ...(notes !== undefined && { notes }),
        ...(channel !== undefined && { channel }),
        ...(platform !== undefined && { platform }),
        ...(stagingPercentage !== undefined && { stagingPercentage }),
        ...(isPublic !== undefined && { isPublic }),
        ...(published !== undefined && { published }),
      },
      include: {
        files: true,
      },
    });

    return NextResponse.json(release);
  } catch (error) {
    console.error('Error updating release:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete release
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const release = await prisma.release.findUnique({
      where: { id },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    // Delete S3 files first
    await deleteReleaseFiles(id);

    // Delete release (cascades to files, api keys, stats, tracking)
    await prisma.release.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Release deleted successfully' });
  } catch (error) {
    console.error('Error deleting release:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
