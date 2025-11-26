import Link from 'next/link';
import { 
  Package, 
  Download, 
  TrendingUp, 
  AppWindow, 
  ArrowRight,
  Clock,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getStats() {
  const [
    totalApps,
    totalReleases,
    publishedReleases,
    totalDownloads,
    recentDownloads,
    totalApiKeys,
  ] = await Promise.all([
    prisma.app.count(),
    prisma.release.count(),
    prisma.release.count({ where: { published: true } }),
    prisma.downloadStat.count({ where: { type: 'download' } }),
    prisma.downloadStat.count({
      where: {
        type: 'download',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.apiKey.count(),
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

async function getRecentReleases() {
  return prisma.release.findMany({
    take: 5,
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
  const stats = await getStats();
  const recentReleases = await getRecentReleases();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Shipyard update server
          </p>
        </div>
        <Link href="/dashboard/apps">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New App
          </Button>
        </Link>
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
        <CardHeader className="flex flex-row items-center justify-between">
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
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                  <div className="text-right flex items-center gap-4">
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
