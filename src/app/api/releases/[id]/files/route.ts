import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

type RouteParams = Promise<{ id: string }>;

// POST - Add file record to release
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: releaseId } = await params;

  try {
    const body = await request.json();
    const { filename, s3Key, sha512, size, arch } = body;

    if (!filename || !s3Key || !sha512 || !size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify release exists
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    const file = await prisma.releaseFile.create({
      data: {
        releaseId,
        filename,
        s3Key,
        sha512,
        size,
        arch,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Error adding file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
