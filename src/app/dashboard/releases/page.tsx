import Link from 'next/link';
import { Package, Plus, Filter, Download, Calendar, AppWindow } from 'lucide-react';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<{ channel?: string; platform?: string; appId?: string }>;
}

async function getApps() {
  return prisma.app.findMany({
    orderBy: { name: 'asc' },
  });
}

async function getReleases(channel?: string, platform?: string, appId?: string) {
  return prisma.release.findMany({
    where: {
      ...(channel && channel !== 'all' && { channel }),
      ...(platform && platform !== 'all' && { platform }),
      ...(appId && appId !== 'all' && { appId }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      files: true,
      app: true,
      _count: {
        select: { downloadStats: { where: { type: 'download' } } },
      },
    },
  });
}

export default async function ReleasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [releases, apps] = await Promise.all([
    getReleases(params.channel, params.platform, params.appId),
    getApps(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <form className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select name="appId" defaultValue={params.appId || 'all'}>
                <SelectTrigger>
                  <SelectValue placeholder="App" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select name="channel" defaultValue={params.channel || 'all'}>
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select name="platform" defaultValue={params.platform || 'all'}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                  <SelectItem value="mac">macOS</SelectItem>
                  <SelectItem value="linux">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Releases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            All Releases
          </CardTitle>
          <CardDescription>
            {releases.length} release{releases.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No releases found</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                Create your first release to get started distributing updates.
              </p>
              <Link href="/dashboard/releases/new">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Release
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {release.app.icon ? (
                          <img
                            src={release.app.icon}
                            alt={release.app.name}
                            className="w-5 h-5 rounded"
                          />
                        ) : (
                          <AppWindow className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{release.app.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      <Link 
                        href={`/dashboard/releases/${release.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        v{release.version}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {release.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          release.channel === 'latest' ? 'border-green-500 text-green-600' :
                          release.channel === 'beta' ? 'border-blue-500 text-blue-600' :
                          'border-orange-500 text-orange-600'
                        }
                      >
                        {release.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{release.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={release.published ? 'default' : 'secondary'}>
                          {release.published ? 'Published' : 'Draft'}
                        </Badge>
                        {!release.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${release.stagingPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {release.stagingPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Download className="h-3 w-3" />
                        {release._count.downloadStats.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(release.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/releases/${release.id}`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
