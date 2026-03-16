import type { PrismaClient } from '@/generated/prisma';
import prisma from '@/lib/db';
import {
  FREE_PLAN_MAX_APPS,
  FREE_PLAN_MAX_RELEASES_PER_APP,
} from '@/lib/tenant-access';

const MAX_APPS_PER_USER_KEY = 'freePlan.maxAppsPerUser';
const MAX_RELEASES_PER_APP_KEY = 'freePlan.maxReleasesPerApp';
const ALLOW_PUBLIC_SIGNUP_KEY = 'auth.allowPublicSignup';
const prismaClient = prisma as PrismaClient;

export interface PlatformLimits {
  maxAppsPerUser: number;
  maxReleasesPerApp: number;
  allowPublicSignup: boolean;
}

export async function getPlatformLimits(): Promise<PlatformLimits> {
  const settings = await prismaClient.platformSetting.findMany({
    where: {
      key: {
        in: [
          MAX_APPS_PER_USER_KEY,
          MAX_RELEASES_PER_APP_KEY,
          ALLOW_PUBLIC_SIGNUP_KEY,
        ],
      },
    },
  });

  const settingsMap = new Map<string, string>(
    settings.map((setting: { key: string; value: string }) => [setting.key, setting.value])
  );

  return {
    maxAppsPerUser: parsePositiveInt(
      settingsMap.get(MAX_APPS_PER_USER_KEY),
      FREE_PLAN_MAX_APPS
    ),
    maxReleasesPerApp: parsePositiveInt(
      settingsMap.get(MAX_RELEASES_PER_APP_KEY),
      FREE_PLAN_MAX_RELEASES_PER_APP
    ),
    allowPublicSignup: parseBoolean(
      settingsMap.get(ALLOW_PUBLIC_SIGNUP_KEY),
      true
    ),
  };
}

export async function savePlatformLimits(
  limits: PlatformLimits
): Promise<PlatformLimits> {
  await prismaClient.$transaction([
    prismaClient.platformSetting.upsert({
      where: { key: MAX_APPS_PER_USER_KEY },
      create: {
        key: MAX_APPS_PER_USER_KEY,
        value: String(limits.maxAppsPerUser),
      },
      update: {
        value: String(limits.maxAppsPerUser),
      },
    }),
    prismaClient.platformSetting.upsert({
      where: { key: MAX_RELEASES_PER_APP_KEY },
      create: {
        key: MAX_RELEASES_PER_APP_KEY,
        value: String(limits.maxReleasesPerApp),
      },
      update: {
        value: String(limits.maxReleasesPerApp),
      },
    }),
    prismaClient.platformSetting.upsert({
      where: { key: ALLOW_PUBLIC_SIGNUP_KEY },
      create: {
        key: ALLOW_PUBLIC_SIGNUP_KEY,
        value: String(limits.allowPublicSignup),
      },
      update: {
        value: String(limits.allowPublicSignup),
      },
    }),
  ]);

  return limits;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}
