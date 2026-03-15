import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  findTenantAppOrResponse,
  requireAdminUser,
  requireAuthenticatedUser,
} from '@/lib/route-auth';
import {
  createApiKeySchema,
  getValidationError,
} from '@/lib/request-schemas';

type RouteParams = Promise<{ id: string }>;

// GET - List API keys for an app
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAuthenticatedUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id: appId } = await params;

  try {
    const appAccess = await findTenantAppOrResponse(appId, user);
    if ('response' in appAccess) {
      return appAccess.response;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { appId: appAccess.app.id },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
        createdBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new API key for an app
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id: appId } = await params;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }
    const { name, expiresInDays } = parsed.data;

    // Check if app exists
    const appAccess = await findTenantAppOrResponse(appId, user);
    if ('response' in appAccess) {
      return appAccess.response;
    }

    // Generate a new API key
    const plainKey = `euk_${uuidv4().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(plainKey, 12);

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        appId: appAccess.app.id,
        expiresAt,
        createdById: user.id,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the plain key only once - it won't be retrievable later
    return NextResponse.json({
      ...apiKey,
      key: plainKey,
      message: 'Save this key now - it will not be shown again',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
