import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { findTenantApiKeyOrResponse, requireAdminUser } from '@/lib/route-auth';

type RouteParams = Promise<{ id: string }>;

// DELETE - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id: keyId } = await params;

  try {
    const access = await findTenantApiKeyOrResponse(keyId, user);
    if ('response' in access) {
      return access.response;
    }

    await prisma.apiKey.delete({
      where: { id: access.apiKey.id },
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
