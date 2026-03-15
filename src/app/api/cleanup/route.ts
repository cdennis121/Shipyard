import { NextRequest, NextResponse } from 'next/server';
import { cleanupOrphanedFiles } from '@/lib/cleanup';
import { requirePlatformAdminUser } from '@/lib/route-auth';
import {
  cleanupRequestSchema,
  getValidationError,
} from '@/lib/request-schemas';

// POST - Trigger manual cleanup
export async function POST(request: NextRequest) {
  const authResult = await requirePlatformAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = cleanupRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { dryRun } = parsed.data;

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
  const authResult = await requirePlatformAdminUser();
  if ('response' in authResult) {
    return authResult.response;
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
