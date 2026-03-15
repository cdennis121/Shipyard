import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminUser } from '@/lib/route-auth';
import {
  getValidationError,
  updateTenantBrandingSchema,
} from '@/lib/request-schemas';

export async function GET() {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  return NextResponse.json({
    id: authResult.user.tenant.id,
    name: authResult.user.tenant.name,
    slug: authResult.user.tenant.slug,
    role: authResult.user.role,
  });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateTenantBrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id: authResult.user.tenantId },
      data: {
        name: parsed.data.name,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
