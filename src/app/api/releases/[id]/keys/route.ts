import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

type RouteParams = Promise<{ id: string }>;

// Helper to get current user from database
async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  // First try by ID
  if (session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user) return user;
  }

  // Fallback: find by username (handles case where session has old ID after DB reset)
  if (session.user.name) {
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
    });
    if (user) return user;
  }

  return null;
}

// GET - List API keys for a release's app
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: releaseId } = await params;

  try {
    // Get the release to find its app
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      select: { appId: true },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { appId: release.appId },
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

// POST - Create new API key for a release's app
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: releaseId } = await params;

  try {
    const body = await request.json();
    const { name, expiresInDays } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if release exists and get its app
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      select: { appId: true },
    });

    if (!release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
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
        appId: release.appId,
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
