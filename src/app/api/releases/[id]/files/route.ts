import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminUser } from '@/lib/route-auth';
import {
  createReleaseFileSchema,
  getValidationError,
} from '@/lib/request-schemas';

type RouteParams = Promise<{ id: string }>;

// POST - Add file record to release
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { id: releaseId } = await params;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createReleaseFileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { filename, s3Key, sha512, size, arch } = parsed.data;

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
