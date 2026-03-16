import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Filter } from 'lucide-react';
import prisma from '@/lib/db';
import { ReleasesFilters } from '@/components/ReleasesFilters';
import { ReleasesListClient } from '@/components/ReleasesListClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/route-auth';
import {
  getAppAccessWhere,
  getReleaseAccessWhere,
} from '@/lib/tenant-access';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

async function getApps(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return prisma.app.findMany({
    where: getAppAccessWhere(user),
    orderBy: { name: 'asc' },
  });
}

async function getReleases(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
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
      ...getReleaseAccessWhere(user),
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
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [releases, apps] = await Promise.all([
    getReleases(
      user,
      params.channel,
      params.platform,
      params.appId,
      params.status,
      params.q,
      params.sort
    ),
    getApps(user),
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
        initialReleases={releases}
        hasFilters={hasFilters}
      />
    </div>
  );
}
