import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deleteFile } from '@/lib/s3-operations';
import { findTenantReleaseOrResponse, requireAdminUser } from '@/lib/route-auth';

type RouteParams = Promise<{ id: string; fileId: string }>;

// DELETE - Delete a release file
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id: releaseId, fileId } = await params;

  try {
    const releaseAccess = await findTenantReleaseOrResponse(releaseId, user);
    if ('response' in releaseAccess) {
      return releaseAccess.response;
    }

    const file = await prisma.releaseFile.findFirst({
      where: {
        id: fileId,
        releaseId: releaseAccess.release.id,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      await deleteFile(file.s3Key);
    } catch (error) {
      console.error('Error deleting from S3:', error);
    }

    // Delete from database
    await prisma.releaseFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
