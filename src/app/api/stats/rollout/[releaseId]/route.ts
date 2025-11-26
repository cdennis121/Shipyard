import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

type RouteParams = Promise<{ releaseId: string }>;

// GET - Get rollout statistics for a release
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { releaseId } = await params;

  try {
    // Get rollout tracking statistics
    const [totalChecks, eligibleCount, release] = await Promise.all([
      prisma.rolloutTracking.count({
        where: { releaseId },
      }),
      prisma.rolloutTracking.count({
        where: { releaseId, eligible: true },
      }),
      prisma.release.findUnique({
        where: { id: releaseId },
        select: { stagingPercentage: true },
      }),
    ]);

    // Get download statistics over time
    const downloadsByDay = await prisma.downloadStat.groupBy({
      by: ['createdAt'],
      where: {
        releaseId,
        type: 'download',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: true,
    });

    // Process downloads by day
    const downloadsMap = new Map<string, number>();
    downloadsByDay.forEach((item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      downloadsMap.set(date, (downloadsMap.get(date) || 0) + item._count);
    });

    // Create array for last 30 days
    const downloadHistory = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      downloadHistory.push({
        date,
        downloads: downloadsMap.get(date) || 0,
      });
    }

    // Get platform breakdown
    const platformBreakdown = await prisma.downloadStat.groupBy({
      by: ['platform'],
      where: {
        releaseId,
        type: 'download',
      },
      _count: true,
    });

    return NextResponse.json({
      rollout: {
        totalChecks,
        eligibleCount,
        eligiblePercentage: totalChecks > 0 ? (eligibleCount / totalChecks) * 100 : 0,
        targetPercentage: release?.stagingPercentage || 100,
      },
      downloads: {
        total: downloadsByDay.reduce((sum, item) => sum + item._count, 0),
        history: downloadHistory,
      },
      platformBreakdown: platformBreakdown.map((p) => ({
        platform: p.platform || 'unknown',
        count: p._count,
      })),
    });
  } catch (error) {
    console.error('Error fetching rollout stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
