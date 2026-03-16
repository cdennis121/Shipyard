import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/route-auth';
import { getApiKeyAccessWhere } from '@/lib/tenant-access';

export const dynamic = 'force-dynamic';

// GET /api/keys - List all API keys
export async function GET() {
  try {
    const authResult = await requireAuthenticatedUser();
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const apiKeys = await prisma.apiKey.findMany({
      where: getApiKeyAccessWhere(user),
      orderBy: { createdAt: 'desc' },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    // Don't return the actual key hash
    const safeKeys = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      app: key.app,
      createdBy: key.createdBy,
      // Show last 4 chars only if available (we won't have the original key)
      keyPreview: '••••••••',
    }));

    return NextResponse.json(safeKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
