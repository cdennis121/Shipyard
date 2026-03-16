import type { PrismaClient } from '@/generated/prisma';
import prisma from '@/lib/db';

const LOGIN_USERNAME_RULE = {
  scope: 'login:username',
  limit: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
};

const LOGIN_IP_RULE = {
  scope: 'login:ip',
  limit: 10,
  windowMs: 15 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
};

const SIGNUP_IP_RULE = {
  scope: 'signup:ip',
  limit: 5,
  windowMs: 60 * 60 * 1000,
  blockMs: 2 * 60 * 60 * 1000,
};
const prismaClient = prisma as PrismaClient;

interface RateLimitRule {
  scope: string;
  limit: number;
  windowMs: number;
  blockMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkLoginRateLimit(
  username: string,
  ipAddress: string
): Promise<RateLimitResult> {
  const [usernameResult, ipResult] = await Promise.all([
    getRateLimitStatus(LOGIN_USERNAME_RULE, normalizeIdentifier(username)),
    getRateLimitStatus(LOGIN_IP_RULE, normalizeIdentifier(ipAddress)),
  ]);

  if (!usernameResult.allowed) {
    return usernameResult;
  }

  return ipResult;
}

export async function recordLoginFailure(username: string, ipAddress: string) {
  await Promise.all([
    registerAttempt(LOGIN_USERNAME_RULE, normalizeIdentifier(username)),
    registerAttempt(LOGIN_IP_RULE, normalizeIdentifier(ipAddress)),
  ]);
}

export async function clearLoginFailures(username: string, ipAddress: string) {
  await clearAttempts(LOGIN_USERNAME_RULE, normalizeIdentifier(username));
  await clearAttempts(LOGIN_IP_RULE, normalizeIdentifier(ipAddress));
}

export async function consumeSignupAttempt(ipAddress: string) {
  return registerAttempt(SIGNUP_IP_RULE, normalizeIdentifier(ipAddress));
}

export async function checkSignupRateLimit(ipAddress: string) {
  return getRateLimitStatus(SIGNUP_IP_RULE, normalizeIdentifier(ipAddress));
}

export function getHeadersIp(
  headers: Pick<Headers, 'get'> | null | undefined
): string {
  const forwardedFor = headers?.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return headers?.get('x-real-ip') || 'unknown';
}

async function getRateLimitStatus(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  const key = buildThrottleKey(rule.scope, identifier);
  const throttle = await prismaClient.authThrottle.findUnique({
    where: { key },
  });

  if (!throttle) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = new Date();

  if (throttle.blockedUntil && throttle.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: getRetryAfterSeconds(throttle.blockedUntil, now),
    };
  }

  if (throttle.windowStartedAt.getTime() + rule.windowMs <= now.getTime()) {
    await clearAttempts(rule, identifier);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function registerAttempt(rule: RateLimitRule, identifier: string) {
  const key = buildThrottleKey(rule.scope, identifier);
  const now = new Date();
  const existing = await prismaClient.authThrottle.findUnique({
    where: { key },
  });

  if (!existing) {
    await prismaClient.authThrottle.create({
      data: {
        key,
        scope: rule.scope,
        identifier,
        attempts: 1,
        windowStartedAt: now,
      },
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: getRetryAfterSeconds(existing.blockedUntil, now),
    };
  }

  const windowExpired =
    existing.windowStartedAt.getTime() + rule.windowMs <= now.getTime();
  const attempts = windowExpired ? 1 : existing.attempts + 1;
  const blockedUntil = attempts > rule.limit
    ? new Date(now.getTime() + rule.blockMs)
    : null;

  await prismaClient.authThrottle.update({
    where: { key },
    data: {
      attempts,
      windowStartedAt: windowExpired ? now : existing.windowStartedAt,
      blockedUntil,
    },
  });

  return {
    allowed: blockedUntil === null,
    retryAfterSeconds: blockedUntil
      ? getRetryAfterSeconds(blockedUntil, now)
      : 0,
  };
}

async function clearAttempts(rule: RateLimitRule, identifier: string) {
  const key = buildThrottleKey(rule.scope, identifier);

  await prismaClient.authThrottle.deleteMany({
    where: { key },
  });
}

function buildThrottleKey(scope: string, identifier: string) {
  return `${scope}:${identifier}`;
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase() || 'unknown';
}

function getRetryAfterSeconds(blockedUntil: Date, now: Date) {
  return Math.max(
    1,
    Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
  );
}
