import { NextRequest, NextResponse } from 'next/server';
import { getUploadUrl, generateS3Key } from '@/lib/s3-operations';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/db';
import { requireTenantManagerUser } from '@/lib/route-auth';
import {
  getValidationError,
  uploadRequestSchema,
} from '@/lib/request-schemas';
import { getReleaseAccessWhere } from '@/lib/tenant-access';

// POST - Get presigned upload URL
export async function POST(request: NextRequest) {
  const authResult = await requireTenantManagerUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  try {
    const body = await request.json().catch(() => null);
    const parsed = uploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { releaseId, filename, contentType, channel, platform, version } = parsed.data;

    const release = await prisma.release.findFirst({
      where: {
        id: releaseId,
        ...getReleaseAccessWhere(user),
      },
      select: {
        id: true,
        channel: true,
        platform: true,
        version: true,
      },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    if (
      release.channel !== channel ||
      release.platform !== platform ||
      release.version !== version
    ) {
      return NextResponse.json(
        { error: 'Upload payload does not match the target release' },
        { status: 400 }
      );
    }

    // Generate unique S3 key
    const uniqueFilename = `${uuidv4()}-${filename}`;
    const s3Key = generateS3Key(channel, platform, version, uniqueFilename);

    // Get presigned upload URL
    const uploadUrl = await getUploadUrl(s3Key, contentType, 3600);

    return NextResponse.json({
      uploadUrl,
      s3Key,
      filename,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
