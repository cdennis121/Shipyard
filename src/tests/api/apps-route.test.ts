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

import { GET, POST } from '@/app/api/apps/route';

describe('/api/apps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes app listing to the authenticated member', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.app.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(prismaMock.app.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: 'user-1' },
      })
    );
  });

  it('allows admins to list all apps', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    });
    prismaMock.app.findMany.mockResolvedValue([]);

    await GET();

    expect(prismaMock.app.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('blocks member app creation when the quota is reached', async () => {
    requireTenantManagerUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.app.findUnique.mockResolvedValue(null);
    prismaMock.app.count.mockResolvedValue(1);
    getPlatformLimits.mockResolvedValue({
      maxAppsPerUser: 1,
      maxReleasesPerApp: 5,
      allowPublicSignup: true,
    });

    const request = new NextRequest('http://localhost/api/apps', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Tenant App',
        slug: 'tenant-app',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Free accounts can host up to 1 app',
    });
    expect(prismaMock.app.create).not.toHaveBeenCalled();
  });
});
