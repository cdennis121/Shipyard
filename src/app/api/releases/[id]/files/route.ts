import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { findTenantReleaseOrResponse, requireAdminUser } from '@/lib/route-auth';
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
  const { user } = authResult;

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
    const releaseAccess = await findTenantReleaseOrResponse(releaseId, user);
    if ('response' in releaseAccess) {
      return releaseAccess.response;
    }

    const file = await prisma.releaseFile.create({
      data: {
        releaseId: releaseAccess.release.id,
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
