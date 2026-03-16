'use client';

import { useDeferredValue, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AppWindow,
  Plus,
  Trash2,
  Edit,
  Package,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';

interface App {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  createdBy: {
    username: string;
  };
  _count: {
    releases: number;
    downloadStats: number;
  };
}

interface AppsClientProps {
  currentUserRole: string;
  maxAppsPerUser: number;
}

export function AppsClient({ currentUserRole, maxAppsPerUser }: AppsClientProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [appToDelete, setAppToDelete] = useState<App | null>(null);
  const [error, setError] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingApp) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async () => {
    if (!name || !slug) {
      setError('Name and slug are required');
      return;
    }

    setSaving(true);
    setError('');
    const appName = name;

    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create app');
      }

      await fetchApps();
      resetForm();
      setCreateDialogOpen(false);
      toast.success(`Created ${appName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingApp || !name) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');
    const appName = name;

    try {
      const response = await fetch(`/api/apps/${editingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to update app');
      }

      await fetchApps();
      resetForm();
      setEditingApp(null);
      toast.success(`Updated ${appName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appToDelete) return;

    setDeletingAppId(appToDelete.id);

    try {
      const response = await fetch(`/api/apps/${appToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete app'));
      }

      await fetchApps();
      toast.success(`Deleted ${appToDelete.name}`);
      setAppToDelete(null);
    } catch (error) {
      console.error('Failed to delete app:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete app');
    } finally {
      setDeletingAppId(null);
    }
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setError('');
  };

  const openEditDialog = (app: App) => {
    setEditingApp(app);
    setName(app.name);
    setSlug(app.slug);
    setDescription(app.description || '');
    setError('');
  };

  const copyUpdateUrl = async (appSlug: string) => {
    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/updates/${appSlug}/latest.yml`;
      await navigator.clipboard.writeText(url);
      setCopiedSlug(appSlug);
      setTimeout(() => setCopiedSlug(null), 2000);
      toast.success('Update URL copied');
    } catch {
      toast.error('Failed to copy update URL');
    }
  };

  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const visibleApps = [...apps]
    .filter((app) => {
      if (!normalizedSearch) return true;

      return [
        app.name,
        app.slug,
        app.description || '',
        app.createdBy.username,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (sortBy) {
        case 'name':
          return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
        case 'releases':
          return (
            right._count.releases - left._count.releases ||
            left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
          );
        case 'downloads':
          return (
            right._count.downloadStats - left._count.downloadStats ||
            left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
          );
        case 'oldest':
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        default:
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    });
  const hasViewFilters = normalizedSearch.length > 0 || sortBy !== 'recent';
  const isAppCreationDisabled =
    currentUserRole !== 'admin' && apps.length >= maxAppsPerUser;
  const resultLabel =
    visibleApps.length === apps.length
      ? `${apps.length} app${apps.length !== 1 ? 's' : ''}`
      : `Showing ${visibleApps.length} of ${apps.length} apps`;

  const resetViewFilters = () => {
    setSearchQuery('');
    setSortBy('recent');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
          <p className="text-muted-foreground">
            {currentUserRole === 'admin'
              ? 'Manage all hosted Electron applications'
              : `Manage your Electron applications. Free accounts can host up to ${maxAppsPerUser} app${maxAppsPerUser === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Dialog 
          open={createDialogOpen} 
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={isAppCreationDisabled}>
              <Plus className="h-4 w-4" />
              New App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New App</DialogTitle>
              <DialogDescription>
                Add a new Electron application to manage updates for
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">App Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Electron App"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-electron-app"
                />
                <p className="text-xs text-muted-foreground">
                  Used in update URLs: /updates/<strong>{slug || 'your-app'}</strong>/latest.yml
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your app"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || isAppCreationDisabled}>
                {saving ? 'Creating...' : 'Create App'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isAppCreationDisabled && (
        <Alert>
            <AlertDescription>
            Free plan limit reached. You can host up to {maxAppsPerUser} app{maxAppsPerUser === 1 ? '' : 's'} per account.
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={!!editingApp} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingApp(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit App</DialogTitle>
            <DialogDescription>
              Update app details (slug cannot be changed)
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">App Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Slug cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApp(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!appToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setAppToDelete(null);
          }
        }}
        title="Delete app"
        description={
          appToDelete
            ? `Delete "${appToDelete.name}"? This will remove all releases, files, and download data for this app.`
            : 'Delete this app?'
        }
        confirmLabel="Delete app"
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
        isPending={deletingAppId === appToDelete?.id}
      />

      {apps.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="app-search">Search apps</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="app-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by app name, slug, description, or owner"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 lg:w-60">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort apps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="releases">Most releases</SelectItem>
                  <SelectItem value="downloads">Most downloads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 lg:pb-0.5">
              {hasViewFilters && (
                <Button variant="outline" onClick={resetViewFilters} className="w-full lg:w-auto">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
              <div className="hidden rounded-md border px-3 py-2 text-sm text-muted-foreground lg:flex lg:items-center lg:gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {resultLabel}
              </div>
            </div>
            <p className="text-sm text-muted-foreground lg:hidden">{resultLabel}</p>
          </CardContent>
        </Card>
      )}

      {/* Apps Grid */}
      {apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AppWindow className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No apps yet</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Create your first app to start managing Electron updates.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={() => setCreateDialogOpen(true)}
              disabled={isAppCreationDisabled}
            >
              <Plus className="h-4 w-4" />
              Create Your First App
            </Button>
          </CardContent>
        </Card>
      ) : (
        visibleApps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No apps match your filters</h3>
              <p className="mt-1 max-w-sm text-muted-foreground">
                Try a broader search or clear the current sort and filter settings.
              </p>
              <Button variant="outline" className="mt-4 gap-2" onClick={resetViewFilters}>
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleApps.map((app) => (
            <Card key={app.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <AppWindow className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {app.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(app)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setAppToDelete(app)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {app.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{app._count.releases} releases</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span>{app._count.downloadStats.toLocaleString()} downloads</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <code className="text-xs flex-1 truncate">
                    /updates/{app.slug}/latest.yml
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyUpdateUrl(app.slug)}
                  >
                    {copiedSlug === app.slug ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link href={`/dashboard/releases?appId=${app.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Package className="h-3 w-3" />
                      Releases
                    </Button>
                  </Link>
                  <Link href={`/dashboard/releases/new?appId=${app.id}`} className="sm:flex-none">
                    <Button size="sm" className="w-full gap-1">
                      <Plus className="h-3 w-3" />
                      New Release
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
      )}
    </div>
  );
}
