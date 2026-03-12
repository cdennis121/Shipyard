'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import Link from 'next/link';
import {
  AppWindow,
  Calendar,
  CheckSquare,
  Download,
  Package,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';
import { toast } from 'sonner';

interface ReleaseListItem {
  id: string;
  version: string;
  name: string | null;
  channel: string;
  platform: string;
  stagingPercentage: number;
  isPublic: boolean;
  published: boolean;
  createdAt: string;
  app: {
    id: string;
    name: string;
    icon: string | null;
  };
  _count: {
    downloadStats: number;
  };
}

interface ReleasesListClientProps {
  initialReleases: ReleaseListItem[];
  hasFilters: boolean;
}

function getChannelBadgeClass(channel: string) {
  if (channel === 'latest') {
    return 'border-green-500 text-green-600';
  }

  if (channel === 'beta') {
    return 'border-blue-500 text-blue-600';
  }

  return 'border-orange-500 text-orange-600';
}

export function ReleasesListClient({
  initialReleases,
  hasFilters,
}: ReleasesListClientProps) {
  const [releases, setReleases] = useState(initialReleases);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);
  const [releasesToDelete, setReleasesToDelete] = useState<ReleaseListItem[]>([]);
  const [isMutating, setIsMutating] = useState(false);

  const selectedReleases = releases.filter((release) =>
    selectedReleaseIds.includes(release.id)
  );
  const allReleasesSelected =
    releases.length > 0 && selectedReleaseIds.length === releases.length;
  const resultLabel = hasFilters
    ? `${releases.length} matching release${releases.length !== 1 ? 's' : ''}`
    : `${releases.length} release${releases.length !== 1 ? 's' : ''}`;

  const toggleReleaseSelection = (releaseId: string) => {
    setSelectedReleaseIds((currentIds) =>
      currentIds.includes(releaseId)
        ? currentIds.filter((id) => id !== releaseId)
        : [...currentIds, releaseId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedReleaseIds(allReleasesSelected ? [] : releases.map((release) => release.id));
  };

  const clearSelection = () => {
    setSelectedReleaseIds([]);
  };

  const updatePublishedState = async (targets: ReleaseListItem[], published: boolean) => {
    if (targets.length === 0) return;

    setIsMutating(true);
    const updatedIds: string[] = [];
    let failureMessage: string | null = null;

    for (const release of targets) {
      try {
        const response = await fetch(`/api/releases/${release.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published }),
        });

        if (!response.ok) {
          failureMessage =
            failureMessage ||
            (await readErrorMessage(
              response,
              `Failed to ${published ? 'publish' : 'unpublish'} release`
            ));
          continue;
        }

        updatedIds.push(release.id);
      } catch {
        failureMessage =
          failureMessage || `Failed to ${published ? 'publish' : 'unpublish'} release`;
      }
    }

    if (updatedIds.length > 0) {
      setReleases((currentReleases) =>
        currentReleases.map((release) =>
          updatedIds.includes(release.id) ? { ...release, published } : release
        )
      );
      setSelectedReleaseIds((currentIds) =>
        currentIds.filter((id) => !updatedIds.includes(id))
      );
      toast.success(
        `${published ? 'Published' : 'Unpublished'} ${updatedIds.length} release${updatedIds.length !== 1 ? 's' : ''}`
      );
    }

    if (failureMessage) {
      toast.error(failureMessage);
    }

    setIsMutating(false);
  };

  const handleDelete = async () => {
    if (releasesToDelete.length === 0) return;

    setIsMutating(true);
    const deletedIds: string[] = [];
    let failureMessage: string | null = null;

    for (const release of releasesToDelete) {
      try {
        const response = await fetch(`/api/releases/${release.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          failureMessage =
            failureMessage ||
            (await readErrorMessage(response, 'Failed to delete release'));
          continue;
        }

        deletedIds.push(release.id);
      } catch {
        failureMessage = failureMessage || 'Failed to delete release';
      }
    }

    if (deletedIds.length > 0) {
      setReleases((currentReleases) =>
        currentReleases.filter((release) => !deletedIds.includes(release.id))
      );
      setSelectedReleaseIds((currentIds) =>
        currentIds.filter((id) => !deletedIds.includes(id))
      );
      toast.success(
        `Deleted ${deletedIds.length} release${deletedIds.length !== 1 ? 's' : ''}`
      );
    }

    if (failureMessage) {
      toast.error(failureMessage);
    }

    setReleasesToDelete([]);
    setIsMutating(false);
  };

  return (
    <Card>
      <ConfirmDialog
        open={releasesToDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setReleasesToDelete([]);
          }
        }}
        title={
          releasesToDelete.length > 1 ? 'Delete selected releases' : 'Delete release'
        }
        description={
          releasesToDelete.length > 1
            ? `Delete ${releasesToDelete.length} selected releases? Their files and rollout data will be removed.`
            : releasesToDelete[0]
              ? `Delete v${releasesToDelete[0].version}? This action cannot be undone and will remove the associated files.`
              : 'Delete this release?'
        }
        confirmLabel={
          releasesToDelete.length > 1 ? 'Delete releases' : 'Delete release'
        }
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
        isPending={isMutating}
      />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          All Releases
        </CardTitle>
        <CardDescription>{resultLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">
              {hasFilters ? 'No releases match your filters' : 'No releases found'}
            </h3>
            <p className="mt-1 max-w-sm text-muted-foreground">
              {hasFilters
                ? 'Try clearing one of the filters or broadening the search query.'
                : 'Create your first release to get started distributing updates.'}
            </p>
            {hasFilters ? (
              <Link href="/dashboard/releases">
                <Button variant="outline" className="mt-4 gap-2">
                  Clear Filters
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/releases/new">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Release
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedReleases.length > 0
                      ? `${selectedReleases.length} release${selectedReleases.length !== 1 ? 's' : ''} selected`
                      : 'Select releases to enable bulk actions'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quickly publish, unpublish, or delete releases from the current result set.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={toggleSelectAll} disabled={isMutating}>
                    {allReleasesSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {allReleasesSelected ? 'Clear all' : `Select all (${releases.length})`}
                  </Button>
                  {selectedReleases.length > 0 && (
                    <Button variant="outline" onClick={clearSelection} disabled={isMutating}>
                      Clear selection
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => updatePublishedState(selectedReleases, true)}
                    disabled={selectedReleases.length === 0 || isMutating}
                  >
                    Publish selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updatePublishedState(selectedReleases, false)}
                    disabled={selectedReleases.length === 0 || isMutating}
                  >
                    Unpublish selected
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setReleasesToDelete(selectedReleases)}
                    disabled={selectedReleases.length === 0 || isMutating}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete selected
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {releases.map((release) => {
                const isSelected = selectedReleaseIds.includes(release.id);

                return (
                  <div
                    key={release.id}
                    className={`rounded-lg border p-4 ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            aria-label={`Select release ${release.version}`}
                            checked={isSelected}
                            onChange={() => toggleReleaseSelection(release.id)}
                            disabled={isMutating}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <div className="flex items-center gap-2">
                            {release.app.icon ? (
                              <img
                                src={release.app.icon}
                                alt={release.app.name}
                                className="h-5 w-5 rounded"
                              />
                            ) : (
                              <AppWindow className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="truncate text-sm font-medium">
                              {release.app.name}
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/releases/${release.id}`}
                          className="block text-base font-semibold transition-colors hover:text-primary"
                        >
                          v{release.version}
                        </Link>
                        {release.name && (
                          <p className="text-sm text-muted-foreground">{release.name}</p>
                        )}
                      </div>

                      <Badge variant={release.published ? 'default' : 'secondary'}>
                        {release.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className={getChannelBadgeClass(release.channel)}>
                        {release.channel}
                      </Badge>
                      <Badge variant="secondary">{release.platform}</Badge>
                      {!release.isPublic && <Badge variant="outline">Private</Badge>}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Rollout
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${release.stagingPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {release.stagingPercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Downloads
                          </p>
                          <p className="mt-1 font-medium">
                            {release._count.downloadStats.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Created
                          </p>
                          <p className="mt-1 font-medium">
                            {new Date(release.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Link href={`/dashboard/releases/${release.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          updatePublishedState([release], !release.published)
                        }
                        disabled={isMutating}
                      >
                        {release.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => setReleasesToDelete([release])}
                        disabled={isMutating}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Select all releases"
                        checked={allReleasesSelected}
                        onChange={toggleSelectAll}
                        disabled={isMutating}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rollout</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map((release) => {
                    const isSelected = selectedReleaseIds.includes(release.id);

                    return (
                      <TableRow
                        key={release.id}
                        className={isSelected ? 'bg-primary/5' : undefined}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select release ${release.version}`}
                            checked={isSelected}
                            onChange={() => toggleReleaseSelection(release.id)}
                            disabled={isMutating}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {release.app.icon ? (
                              <img
                                src={release.app.icon}
                                alt={release.app.name}
                                className="h-5 w-5 rounded"
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
                            className="transition-colors hover:text-primary"
                          >
                            v{release.version}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {release.name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getChannelBadgeClass(release.channel)}>
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
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
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
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(release.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/releases/${release.id}`}>
                              <Button variant="ghost" size="sm" disabled={isMutating}>
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updatePublishedState([release], !release.published)
                              }
                              disabled={isMutating}
                            >
                              {release.published ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setReleasesToDelete([release])}
                              disabled={isMutating}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
