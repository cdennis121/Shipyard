import type { Prisma, User } from '@/generated/prisma';

export const FREE_PLAN_MAX_APPS = 1;
export const FREE_PLAN_MAX_RELEASES_PER_APP = 5;

export function isAdminUser(user: Pick<User, 'role'>) {
  return user.role === 'admin';
}

export function canManageTenant(user: Pick<User, 'role'>) {
  return user.role === 'admin' || user.role === 'member';
}

export function getAppAccessWhere(
  user: Pick<User, 'id' | 'role'>
): Prisma.AppWhereInput {
  if (isAdminUser(user)) {
    return {};
  }

  return {
    createdById: user.id,
  };
}

export function getReleaseAccessWhere(
  user: Pick<User, 'id' | 'role'>
): Prisma.ReleaseWhereInput {
  if (isAdminUser(user)) {
    return {};
  }

  return {
    app: {
      is: {
        createdById: user.id,
      },
    },
  };
}

export function getApiKeyAccessWhere(
  user: Pick<User, 'id' | 'role'>
): Prisma.ApiKeyWhereInput {
  if (isAdminUser(user)) {
    return {};
  }

  return {
    app: {
      is: {
        createdById: user.id,
      },
    },
  };
}

export function getDownloadStatAccessWhere(
  user: Pick<User, 'id' | 'role'>
): Prisma.DownloadStatWhereInput {
  if (isAdminUser(user)) {
    return {};
  }

  return {
    app: {
      is: {
        createdById: user.id,
      },
    },
  };
}

export function getRolloutTrackingAccessWhere(
  user: Pick<User, 'id' | 'role'>
): Prisma.RolloutTrackingWhereInput {
  if (isAdminUser(user)) {
    return {};
  }

  return {
    release: {
      is: {
        app: {
          is: {
            createdById: user.id,
          },
        },
      },
    },
  };
}
