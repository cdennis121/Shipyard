import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDownloadUrl } from '@/lib/s3-operations';
import {
  extractApiKey,
  getRequestIp,
  validateApiKey,
} from '@/lib/update-utils';

type RouteParams = Promise<{ appSlug: string; filename: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { appSlug, filename } = await params;

  try {
    // Find the app by slug
    const app = await prisma.app.findUnique({
      where: { slug: appSlug },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Legacy route fallback: serve the newest published release for this filename.
    const matchingFiles = await prisma.releaseFile.findMany({
      where: {
        filename,
        release: {
          appId: app.id,
          published: true,
        },
      },
      include: {
        release: true,
      },
    });
    const releaseFile = matchingFiles.sort(
      (a, b) =>
        b.release.releaseDate.getTime() - a.release.releaseDate.getTime() ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    if (!releaseFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const release = releaseFile.release;

    // If release is private, validate API key
    if (!release.isPublic) {
      const apiKey = extractApiKey(request);

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key required for private release' },
          { status: 401 }
        );
      }

      const validKey = await validateApiKey(app.id, apiKey);
      
      if (!validKey) {
        return NextResponse.json(
          { error: 'Invalid or expired API key' },
          { status: 403 }
        );
      }
    }

    // Track the download
    await prisma.downloadStat.create({
      data: {
        appId: app.id,
        releaseId: release.id,
        type: 'download',
        platform: release.platform,
        arch: releaseFile.arch || undefined,
        ip: getRequestIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    // Generate presigned download URL and redirect
    const downloadUrl = await getDownloadUrl(
      releaseFile.s3Key,
      3600,
      releaseFile.filename
    );

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

