'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReleaseFilterApp {
  id: string;
  name: string;
}

interface ReleasesFiltersProps {
  apps: ReleaseFilterApp[];
  initialQuery?: string;
  initialAppId?: string;
  initialChannel?: string;
  initialPlatform?: string;
  initialStatus?: string;
  initialSort?: string;
}

export function ReleasesFilters({
  apps,
  initialQuery = '',
  initialAppId = 'all',
  initialChannel = 'all',
  initialPlatform = 'all',
  initialStatus = 'all',
  initialSort = 'newest',
}: ReleasesFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [appId, setAppId] = useState(initialAppId);
  const [channel, setChannel] = useState(initialChannel);
  const [platform, setPlatform] = useState(initialPlatform);
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState(initialSort);

  const hasActiveFilters =
    query.trim().length > 0 ||
    appId !== 'all' ||
    channel !== 'all' ||
    platform !== 'all' ||
    status !== 'all' ||
    sort !== 'newest';

  const pushFilters = (nextValues?: {
    query?: string;
    appId?: string;
    channel?: string;
    platform?: string;
    status?: string;
    sort?: string;
  }) => {
    const params = new URLSearchParams();
    const nextQuery = nextValues?.query ?? query;
    const nextAppId = nextValues?.appId ?? appId;
    const nextChannel = nextValues?.channel ?? channel;
    const nextPlatform = nextValues?.platform ?? platform;
    const nextStatus = nextValues?.status ?? status;
    const nextSort = nextValues?.sort ?? sort;

    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextAppId !== 'all') params.set('appId', nextAppId);
    if (nextChannel !== 'all') params.set('channel', nextChannel);
    if (nextPlatform !== 'all') params.set('platform', nextPlatform);
    if (nextStatus !== 'all') params.set('status', nextStatus);
    if (nextSort !== 'newest') params.set('sort', nextSort);

    const target = params.size > 0 ? `/dashboard/releases?${params.toString()}` : '/dashboard/releases';
    router.push(target);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      pushFilters();
    });
  };

  const handleClear = () => {
    setQuery('');
    setAppId('all');
    setChannel('all');
    setPlatform('all');
    setStatus('all');
    setSort('newest');

    startTransition(() => {
      router.push('/dashboard/releases');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="release-search">Search releases</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="release-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by app, version, release name, or notes"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:flex-1">
          <div className="space-y-2">
            <Label>App</Label>
            <Select value={appId} onValueChange={setAppId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All apps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apps</SelectItem>
                {apps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="alpha">Alpha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="windows">Windows</SelectItem>
                <SelectItem value="mac">macOS</SelectItem>
                <SelectItem value="linux">Linux</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sort by</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Newest first" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="downloads">Most downloaded</SelectItem>
                <SelectItem value="version">Version (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {hasActiveFilters && (
          <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Applying...' : 'Apply Filters'}
        </Button>
      </div>
    </form>
  );
}
