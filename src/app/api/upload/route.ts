import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUploadUrl, generateS3Key } from '@/lib/s3-operations';
import { v4 as uuidv4 } from 'uuid';

// POST - Get presigned upload URL
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, contentType, channel, platform, version } = body;

    if (!filename || !contentType || !channel || !platform || !version) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
