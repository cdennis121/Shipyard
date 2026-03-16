import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  prismaMock,
  requireAuthenticatedUser,
  requireTenantManagerUser,
  getPlatformLimits,
} = vi.hoisted(() => ({
  prismaMock: {
    app: {
      findFirst: vi.fn(),
    },
    release: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  requireAuthenticatedUser: vi.fn(),
  requireTenantManagerUser: vi.fn(),
  getPlatformLimits: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/route-auth', () => ({
  requireAuthenticatedUser,
  requireTenantManagerUser,
}));

vi.mock('@/lib/platform-settings', () => ({
  getPlatformLimits,
}));

import { GET, POST } from '@/app/api/releases/route';

describe('/api/releases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes release listing to the authenticated member and preserves filters', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.release.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost/api/releases?appId=app-1&channel=latest&platform=windows'
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.release.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          app: {
            is: {
              createdById: 'user-1',
            },
          },
          appId: 'app-1',
          channel: 'latest',
          platform: 'windows',
        },
      })
    );
  });

  it('rejects release creation for apps the member does not own', async () => {
    requireTenantManagerUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.app.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/releases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        appId: 'foreign-app',
        version: '1.0.0',
        channel: 'latest',
        platform: 'windows',
        stagingPercentage: 100,
        isPublic: true,
        published: false,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'App not found' });
  });

  it('blocks member release creation when the app release quota is reached', async () => {
    requireTenantManagerUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.app.findFirst.mockResolvedValue({
      id: 'app-1',
      createdById: 'user-1',
    });
    prismaMock.release.count.mockResolvedValue(5);
    getPlatformLimits.mockResolvedValue({
      maxAppsPerUser: 1,
      maxReleasesPerApp: 5,
      allowPublicSignup: true,
    });

    const request = new NextRequest('http://localhost/api/releases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        appId: 'app-1',
        version: '1.0.0',
        channel: 'latest',
        platform: 'windows',
        stagingPercentage: 100,
        isPublic: true,
        published: false,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Free accounts can publish up to 5 releases per app',
    });
    expect(prismaMock.release.create).not.toHaveBeenCalled();
  });
});
