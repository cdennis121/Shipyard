import type { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/db';

export function buildScopedDownloadPath(
  fileId: string,
  filename: string
): string {
  return `download/file/${fileId}/${encodeURIComponent(filename)}`;
}

export function extractApiKey(request: NextRequest): string | null {
  let apiKey =
    request.headers.get('x-api-key') ??
    request.nextUrl.searchParams.get('key');

  if (!apiKey) {
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      apiKey = authHeader.replace(/^Bearer\s+/i, '');
    }
  }

  return apiKey;
}

export async function validateApiKey(
  appId: string,
  providedKey: string
): Promise<boolean> {
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      appId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  for (const key of apiKeys) {
    const isValid = await bcrypt.compare(providedKey, key.keyHash);

    if (isValid) {
      return true;
    }
  }

  return false;
}

export function getRequestIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || undefined;
  }

  return request.headers.get('x-real-ip') || undefined;
}
