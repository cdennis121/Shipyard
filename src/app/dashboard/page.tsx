import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Package, 
  Download, 
  TrendingUp, 
  AppWindow, 
  ArrowRight,
  Clock,
  Plus,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/route-auth';
import {
  getAppAccessWhere,
  getDownloadStatAccessWhere,
  getReleaseAccessWhere,
  isAdminUser,
} from '@/lib/tenant-access';
import { getPlatformLimits } from '@/lib/platform-settings';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getStats(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) {
    redirect('/login');
  }

  const [
    totalApps,
    totalReleases,
    publishedReleases,
    totalDownloads,
    recentDownloads,
    totalApiKeys,
  ] = await Promise.all([
    prisma.app.count({ where: getAppAccessWhere(user) }),
    prisma.release.count({ where: getReleaseAccessWhere(user) }),
    prisma.release.count({ where: { ...getReleaseAccessWhere(user), published: true } }),
    prisma.downloadStat.count({
      where: {
        ...getDownloadStatAccessWhere(user),
        type: 'download',
      },
    }),
    prisma.downloadStat.count({
      where: {
        ...getDownloadStatAccessWhere(user),
        type: 'download',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.apiKey.count({
      where: isAdminUser(user) ? {} : { app: { is: { createdById: user.id } } },
    }),
  ]);

  return {
    totalApps,
    totalReleases,
    publishedReleases,
    totalDownloads,
    recentDownloads,
    totalApiKeys,
  };
}

async function getRecentReleases(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) {
    redirect('/login');
  }

  return prisma.release.findMany({
    take: 5,
    where: getReleaseAccessWhere(user),
    orderBy: { createdAt: 'desc' },
    include: {
      app: {
        select: { name: true, slug: true },
      },
      _count: {
        select: { downloadStats: { where: { type: 'download' } } },
      },
    },
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const limits = await getPlatformLimits();
  const stats = await getStats(user);
  const recentReleases = await getRecentReleases(user);
  const draftReleases = stats.totalReleases - stats.publishedReleases;
  const showFreePlanQuota = user && !isAdminUser(user);
  const nextSteps = [
    {
      title: stats.totalApps === 0 ? 'Create your first app' : 'Manage your apps',
      description:
        stats.totalApps === 0
          ? 'Set up the application record before you upload releases.'
          : `${stats.totalApps} app${stats.totalApps !== 1 ? 's' : ''} connected to Shipyard.`,
      href: '/dashboard/apps',
      actionLabel: stats.totalApps === 0 ? 'Create app' : 'View apps',
      icon: AppWindow,
    },
    {
      title: stats.totalReleases === 0 ? 'Publish your first release' : draftReleases > 0 ? 'Finish your draft releases' : 'Review release history',
      description:
        stats.totalReleases === 0
          ? 'Upload files and publish a release so clients can start updating.'
          : draftReleases > 0
            ? `${draftReleases} draft release${draftReleases !== 1 ? 's' : ''} still need attention.`
            : `${stats.publishedReleases} published release${stats.publishedReleases !== 1 ? 's' : ''} live for your users.`,
      href: stats.totalReleases === 0 ? '/dashboard/releases/new' : '/dashboard/releases',
      actionLabel: stats.totalReleases === 0 ? 'Create release' : 'Review releases',
      icon: Package,
    },
    {
      title: stats.totalApiKeys === 0 ? 'Set up access keys' : 'Review download access',
      description:
        stats.totalApiKeys === 0
          ? 'Generate API keys for private releases and CI distribution.'
          : `${stats.totalApiKeys} API key${stats.totalApiKeys !== 1 ? 's' : ''} currently active across your apps.`,
      href: '/dashboard/api-keys',
      actionLabel: stats.totalApiKeys === 0 ? 'Create key' : 'View keys',
      icon: Key,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {showFreePlanQuota
              ? 'Overview of your hosted apps and free plan usage'
              : 'Overview of your Shipyard update server'}
          </p>
        </div>
        <Link href="/dashboard/apps">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New App
          </Button>
        </Link>
      </div>

      {showFreePlanQuota && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">App Quota</CardTitle>
                <CardDescription>Free plan allowance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.totalApps} / {limits.maxAppsPerUser}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Release Quota</CardTitle>
              <CardDescription>Per app on the free plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{limits.maxReleasesPerApp}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Each app can host up to {limits.maxReleasesPerApp} releases.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {nextSteps.map((step) => {
          const StepIcon = step.icon;

          return (
            <Card key={step.title} className="border-dashed">
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <StepIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription className="mt-1">{step.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={step.href}>
                  <Button variant="outline" className="w-full justify-between">
                    {step.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apps</CardTitle>
            <div className="rounded-full bg-purple-500/10 p-2">
              <AppWindow className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalApps}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Electron applications
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/50 to-purple-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Releases</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalReleases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{stats.publishedReleases}</span> published
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <div className="rounded-full bg-blue-500/10 p-2">
              <Download className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-blue-500" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads (24h)</CardTitle>
            <div className="rounded-full bg-green-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/50 to-green-500" />
        </Card>
      </div>

      {/* Recent Releases */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Releases
            </CardTitle>
            <CardDescription>Your latest release updates</CardDescription>
          </div>
          <Link href="/dashboard/releases">
            <Button variant="outline" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentReleases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No releases yet</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                Create your first release to start distributing updates to your users.
              </p>
              <Link href="/dashboard/releases/new">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Release
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReleases.map((release) => (
                <Link
                  key={release.id}
                  href={`/dashboard/releases/${release.id}`}
                  className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {release.app?.name || 'Unknown App'}
                      </Badge>
                      <span className="font-semibold">v{release.version}</span>
                      <Badge variant={release.published ? 'default' : 'secondary'} className="text-xs">
                        {release.published ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{release.channel}</Badge>
                      <Badge variant="outline" className="text-xs">{release.platform}</Badge>
                    </div>
                    {release.name && (
                      <p className="text-sm text-muted-foreground">{release.name}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:text-right">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {release._count?.downloadStats?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(release.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
