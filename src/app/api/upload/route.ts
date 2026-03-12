import { NextRequest, NextResponse } from 'next/server';
import { getUploadUrl, generateS3Key } from '@/lib/s3-operations';
import { v4 as uuidv4 } from 'uuid';
import { requireAdminUser } from '@/lib/route-auth';
import {
  getValidationError,
  uploadRequestSchema,
} from '@/lib/request-schemas';

// POST - Get presigned upload URL
export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = uploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { filename, contentType, channel, platform, version } = parsed.data;

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
