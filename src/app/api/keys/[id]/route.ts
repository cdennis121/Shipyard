import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireTenantManagerUser } from '@/lib/route-auth';
import { getApiKeyAccessWhere } from '@/lib/tenant-access';

type RouteParams = Promise<{ id: string }>;

// DELETE - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireTenantManagerUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id: keyId } = await params;

  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        ...getApiKeyAccessWhere(user),
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
