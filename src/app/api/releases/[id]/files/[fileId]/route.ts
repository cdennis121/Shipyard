import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { deleteFile } from '@/lib/s3-operations';

type RouteParams = Promise<{ id: string; fileId: string }>;

// DELETE - Delete a release file
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: releaseId, fileId } = await params;

  try {
    const file = await prisma.releaseFile.findFirst({
      where: {
        id: fileId,
        releaseId,
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
