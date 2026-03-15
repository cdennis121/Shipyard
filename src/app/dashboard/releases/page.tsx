import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import prisma from '@/lib/db';
import { ReleasesFilters } from '@/components/ReleasesFilters';
import { ReleasesListClient } from '@/components/ReleasesListClient';
import { getCurrentUser } from '@/lib/route-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<{
    channel?: string;
    platform?: string;
    appId?: string;
    status?: string;
    sort?: string;
    q?: string;
  }>;
}

async function getApps(tenantId: string, isPlatformAdmin: boolean) {
  return prisma.app.findMany({
    where: isPlatformAdmin ? undefined : { tenantId },
    orderBy: { name: 'asc' },
  });
}

async function getReleases(
  tenantId: string,
  isPlatformAdmin: boolean,
  channel?: string,
  platform?: string,
  appId?: string,
  status?: string,
  query?: string,
  sort?: string
) {
  const trimmedQuery = query?.trim();
  const releases = await prisma.release.findMany({
    where: {
      ...(isPlatformAdmin ? {} : { app: { tenantId } }),
      ...(channel && channel !== 'all' && { channel }),
      ...(platform && platform !== 'all' && { platform }),
      ...(appId && appId !== 'all' && { appId }),
      ...(status === 'published' && { published: true }),
      ...(status === 'draft' && { published: false }),
      ...(status === 'private' && { isPublic: false }),
      ...(trimmedQuery && {
        OR: [
          { version: { contains: trimmedQuery, mode: 'insensitive' } },
          { name: { contains: trimmedQuery, mode: 'insensitive' } },
          { notes: { contains: trimmedQuery, mode: 'insensitive' } },
          {
            app: {
              is: {
                name: { contains: trimmedQuery, mode: 'insensitive' },
              },
            },
          },
          {
            app: {
              is: {
                slug: { contains: trimmedQuery, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    },
    include: {
      files: true,
      app: true,
      _count: {
        select: { downloadStats: { where: { type: 'download' } } },
      },
    },
  });

  return releases.sort((left, right) => {
    switch (sort) {
      case 'oldest':
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      case 'downloads':
        return (
          right._count.downloadStats - left._count.downloadStats ||
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      case 'version':
        return left.version.localeCompare(right.version, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      default:
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }
  });
}

export default async function ReleasesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const isPlatformAdmin = user.role === 'platform_admin';
  const params = await searchParams;
  const [releases, apps] = await Promise.all([
    getReleases(
      user.tenantId,
      isPlatformAdmin,
      params.channel,
      params.platform,
      params.appId,
      params.status,
      params.q,
      params.sort
    ),
    getApps(user.tenantId, isPlatformAdmin),
  ]);
  const hasFilters = Boolean(
    params.q?.trim() ||
      (params.channel && params.channel !== 'all') ||
      (params.platform && params.platform !== 'all') ||
      (params.appId && params.appId !== 'all') ||
      (params.status && params.status !== 'all') ||
      (params.sort && params.sort !== 'newest')
  );
  const releasesListKey = [
    params.q || '',
    params.appId || '',
    params.channel || '',
    params.platform || '',
    params.status || '',
    params.sort || '',
    releases.map((release) => release.id).join(','),
  ].join('|');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Releases</h1>
          <p className="text-muted-foreground">
            Manage your application releases
          </p>
        </div>
        <Link href="/dashboard/releases/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Release
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReleasesFilters
            apps={apps.map((app) => ({ id: app.id, name: app.name }))}
            initialQuery={params.q}
            initialAppId={params.appId}
            initialChannel={params.channel}
            initialPlatform={params.platform}
            initialStatus={params.status}
            initialSort={params.sort}
          />
        </CardContent>
      </Card>

      <ReleasesListClient
        key={releasesListKey}
        initialReleases={releases.map((release) => ({
          ...release,
          createdAt: release.createdAt.toISOString(),
          updatedAt: release.updatedAt.toISOString(),
          releaseDate: release.releaseDate.toISOString(),
          files: release.files.map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
          })),
          app: {
            ...release.app,
            createdAt: release.app.createdAt.toISOString(),
            updatedAt: release.app.updatedAt.toISOString(),
          },
        }))}
        hasFilters={hasFilters}
      />
    </div>
  );
}
