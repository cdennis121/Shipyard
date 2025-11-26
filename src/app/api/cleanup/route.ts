import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cleanupOrphanedFiles } from '@/lib/cleanup';

// POST - Trigger manual cleanup
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const result = await cleanupOrphanedFiles(dryRun);

    return NextResponse.json({
      message: dryRun ? 'Dry run completed' : 'Cleanup completed',
      ...result,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// GET - Get cleanup preview (dry run)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanupOrphanedFiles(true);

    return NextResponse.json({
      message: 'Cleanup preview',
      orphanedFiles: result.orphanedFiles,
      count: result.orphanedFiles.length,
    });
  } catch (error) {
    console.error('Cleanup preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup preview' },
      { status: 500 }
    );
  }
}
