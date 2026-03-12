import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDownloadUrl } from '@/lib/s3-operations';
import {
  extractApiKey,
  getRequestIp,
  validateApiKey,
} from '@/lib/update-utils';

type RouteParams = Promise<{
  appSlug: string;
  fileId: string;
  filename: string;
}>;

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { appSlug, fileId, filename } = await params;

  try {
    const app = await prisma.app.findUnique({
      where: { slug: appSlug },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    const releaseFile = await prisma.releaseFile.findUnique({
      where: { id: fileId },
      include: {
        release: true,
      },
    });

    if (
      !releaseFile ||
      releaseFile.filename !== filename ||
      releaseFile.release.appId !== app.id
    ) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const release = releaseFile.release;

    if (!release.published) {
      return NextResponse.json(
        { error: 'Release not published' },
        { status: 404 }
      );
    }

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
