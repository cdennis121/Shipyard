import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  prismaMock,
  checkSignupRateLimit,
  consumeSignupAttempt,
  getHeadersIp,
  getPlatformLimits,
  hash,
} = vi.hoisted(() => ({
  prismaMock: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  checkSignupRateLimit: vi.fn(),
  consumeSignupAttempt: vi.fn(),
  getHeadersIp: vi.fn(),
  getPlatformLimits: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/auth-rate-limit', () => ({
  checkSignupRateLimit,
  consumeSignupAttempt,
  getHeadersIp,
}));

vi.mock('@/lib/platform-settings', () => ({
  getPlatformLimits,
}));

vi.mock('bcrypt', () => ({
  default: {
    hash,
  },
}));

import { POST } from '@/app/api/register/route';

describe('/api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHeadersIp.mockReturnValue('127.0.0.1');
  });

  it('rejects signup when public registration is disabled', async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    getPlatformLimits.mockResolvedValue({
      maxAppsPerUser: 1,
      maxReleasesPerApp: 5,
      allowPublicSignup: false,
    });

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'new-user',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Public signup is currently disabled',
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns 429 when signup is already rate-limited', async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'new-user',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
    await expect(response.json()).resolves.toEqual({
      error: 'Too many signup attempts. Please try again later.',
    });
  });

  it('creates a member account when signup is allowed', async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    consumeSignupAttempt.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    getPlatformLimits.mockResolvedValue({
      maxAppsPerUser: 1,
      maxReleasesPerApp: 5,
      allowPublicSignup: true,
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-password');
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      username: 'new-user',
      role: 'member',
      createdAt: new Date('2026-03-16T10:00:00.000Z'),
    });

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'new-user',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'new-user',
          role: 'member',
          isActive: true,
        }),
      })
    );
  });
});
