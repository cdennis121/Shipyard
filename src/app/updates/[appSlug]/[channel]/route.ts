import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'yaml';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { getDownloadUrl } from '@/lib/s3-operations';

type RouteParams = Promise<{ appSlug: string; channel: string }>;

interface FileInfo {
  filename: string;
  sha512: string;
  size: number;
  arch: string | null;
}

// Check if this is a channel YAML file request
function isChannelFile(path: string): boolean {
  return path.endsWith('.yml') || path.endsWith('.yaml');
}

// Check if this is a file download request
function isFileDownload(path: string): boolean {
  const fileExtensions = ['.exe', '.msi', '.dmg', '.pkg', '.AppImage', '.deb', '.rpm', '.zip', '.tar.gz', '.blockmap', '.nupkg'];
  return fileExtensions.some(ext => path.endsWith(ext));
}

// Platform mapping for channel files
function getPlatformFromChannel(channel: string): string | null {
  if (channel.endsWith('-mac.yml')) return 'mac';
  if (channel.endsWith('-linux.yml')) return 'linux';
  if (channel.endsWith('.yml')) return 'windows';
  return null;
}

// Extract base channel name
function getBaseChannel(channel: string): string {
  return channel
    .replace('-mac.yml', '')
    .replace('-linux.yml', '')
    .replace('.yml', '');
}

// Simple hash function for deterministic rollout
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Helper to extract API key from request
function extractApiKey(request: NextRequest): string | null {
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
  
  return apiKey;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { appSlug, channel: pathSegment } = await params;
  
  // Handle file downloads (e.g., .exe, .dmg, etc.)
  if (isFileDownload(pathSegment)) {
    return handleFileDownload(request, appSlug, pathSegment);
  }
  
  // Handle channel YAML files
  if (isChannelFile(pathSegment)) {
    return handleChannelRequest(request, appSlug, pathSegment);
  }
  
  return NextResponse.json(
    { error: 'Invalid request path' },
    { status: 400 }
  );
}

// Handle file download requests
async function handleFileDownload(
  request: NextRequest,
  appSlug: string,
  filename: string
) {
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

// Handle channel YAML requests
async function handleChannelRequest(
  request: NextRequest,
  appSlug: string,
  channelFile: string
) {
  const platform = getPlatformFromChannel(channelFile);
  const channel = getBaseChannel(channelFile);

  if (!platform) {
    return NextResponse.json(
      { error: 'Invalid channel file format' },
      { status: 400 }
    );
  }

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

    // Find the latest published release for this app, channel, and platform
    const release = await prisma.release.findFirst({
      where: {
        appId: app.id,
        channel,
        platform,
        published: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
      include: {
        files: true,
      },
    });

    if (!release || release.files.length === 0) {
      return NextResponse.json(
        { error: 'No release found' },
        { status: 404 }
      );
    }

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

    // Get client ID from header for rollout tracking
    const clientId = request.headers.get('x-client-id');
    
    // Track rollout if client ID provided
    if (clientId) {
      const clientHash = hashCode(clientId);
      const eligible = (clientHash % 100) < release.stagingPercentage;

      await prisma.rolloutTracking.upsert({
        where: {
          releaseId_clientId: {
            releaseId: release.id,
            clientId,
          },
        },
        create: {
          releaseId: release.id,
          clientId,
          eligible,
        },
        update: {
          eligible,
          checkedAt: new Date(),
        },
      });

      if (!eligible) {
        return new NextResponse(null, { status: 204 });
      }
    }

    // Track the check
    await prisma.downloadStat.create({
      data: {
        appId: app.id,
        releaseId: release.id,
        type: 'check',
        platform,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    // Build the update info YAML
    const primaryFile = release.files[0];
    const updateInfo = {
      version: release.version,
      releaseDate: release.releaseDate.toISOString(),
      ...(release.name && { releaseName: release.name }),
      ...(release.notes && { releaseNotes: release.notes }),
      path: primaryFile.filename,
      sha512: primaryFile.sha512,
      stagingPercentage: release.stagingPercentage,
      files: release.files.map((f: FileInfo) => ({
        url: f.filename,
        sha512: f.sha512,
        size: f.size,
        ...(f.arch && { arch: f.arch }),
      })),
    };

    return new NextResponse(stringify(updateInfo), {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching release:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function validateApiKey(
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
