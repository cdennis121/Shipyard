import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDownloadUrl } from '@/lib/s3-operations';
import bcrypt from 'bcrypt';

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

    // Find the release file by filename within this app
    const releaseFile = await prisma.releaseFile.findFirst({
      where: {
        filename,
        release: {
          appId: app.id,
        },
      },
      include: {
        release: true,
      },
    });

    if (!releaseFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const release = releaseFile.release;

    // Check if release is published
    if (!release.published) {
      return NextResponse.json(
        { error: 'Release not published' },
        { status: 404 }
      );
    }

    // If release is private, validate API key
    if (!release.isPublic) {
      // Support multiple ways to pass the API key:
      // 1. x-api-key header (custom header)
      // 2. Authorization: Bearer <token> (standard OAuth-style)
      // 3. Authorization: <token> (simple auth header)
      // 4. key query parameter
      let apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key');
      
      // Check Authorization header if no x-api-key
      if (!apiKey) {
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
          // Remove "Bearer " prefix if present
          apiKey = authHeader.replace(/^Bearer\s+/i, '');
        }
      }
      
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key required for private release' },
          { status: 401 }
        );
      }

      const validKey = await findValidApiKey(app.id, apiKey);
      
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
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
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

async function findValidApiKey(
  appId: string,
  providedKey: string
): Promise<boolean> {
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      appId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  for (const key of apiKeys) {
    const isValid = await bcrypt.compare(providedKey, key.keyHash);
    if (isValid) {
      return true;
    }
  }

  return false;
}
