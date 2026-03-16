import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock, requireAuthenticatedUser, requireTenantManagerUser } =
  vi.hoisted(() => ({
    prismaMock: {
      app: {
        findFirst: vi.fn(),
      },
    },
    requireAuthenticatedUser: vi.fn(),
    requireTenantManagerUser: vi.fn(),
  }));

vi.mock('@/lib/db', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/route-auth', () => ({
  requireAuthenticatedUser,
  requireTenantManagerUser,
}));

import { GET } from '@/app/api/apps/[id]/route';

describe('/api/apps/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when a member requests another tenant app', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1', role: 'member' },
    });
    prismaMock.app.findFirst.mockResolvedValue(null);

    const response = await GET(
      new NextRequest('http://localhost/api/apps/app-2'),
      { params: Promise.resolve({ id: 'app-2' }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'App not found' });
    expect(prismaMock.app.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'app-2',
          createdById: 'user-1',
        },
      })
    );
  });
});
