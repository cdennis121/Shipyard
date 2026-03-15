import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/db';
import {
  createTenantSignupSchema,
  getValidationError,
} from '@/lib/request-schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createTenantSignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }

    const { brandName, tenantSlug, username, password } = parsed.data;

    const [existingTenant, existingUser] = await prisma.$transaction([
      prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      }),
      prisma.user.findFirst({
        where: {
          username,
          tenant: {
            slug: tenantSlug,
          },
        },
      }),
    ]);

    if (existingTenant) {
      return NextResponse.json(
        { error: 'That brand URL is already taken' },
        { status: 409 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'That username already exists for this tenant' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: brandName,
        slug: tenantSlug,
        users: {
          create: {
            username,
            passwordHash,
            role: 'admin',
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant,
        username,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
