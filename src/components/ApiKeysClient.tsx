'use client';

import { useDeferredValue, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  User,
  Package,
  Search,
  ArrowUpDown,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';

interface App {
  id: string;
  name: string;
  slug: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  expiresAt: string | null;
  createdAt: string;
  app: App;
  createdBy: {
    username: string;
  };
}

export function ApiKeysClient() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keysToDelete, setKeysToDelete] = useState<ApiKey[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [deletingKeyIds, setDeletingKeyIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Form state
  const [selectedApp, setSelectedApp] = useState('');
  const [keyName, setKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [creating, setCreating] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    fetchApiKeys();
    fetchApps();
  }, []);

  useEffect(() => {
    setSelectedKeyIds([]);
  }, [deferredSearchQuery, statusFilter, sortBy]);

  useEffect(() => {
    setSelectedKeyIds((currentIds) =>
      currentIds.filter((id) => apiKeys.some((key) => key.id === id))
    );
  }, [apiKeys]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    }
  };

  const handleCreate = async () => {
    if (!selectedApp || !keyName) {
      setError('Please select an app and enter a key name');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch(`/api/apps/${selectedApp}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to create API key'));
      }

      const data = await response.json();
      setNewKey(data.key);
      await fetchApiKeys();
      toast.success('API key created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (keysToDelete.length === 0) return;

    setDeletingKeyIds(keysToDelete.map((key) => key.id));
    const revokedIds: string[] = [];
    let failureMessage: string | null = null;

    for (const key of keysToDelete) {
      try {
        const response = await fetch(`/api/keys/${key.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          failureMessage =
            failureMessage ||
            (await readErrorMessage(response, 'Failed to revoke API key'));
          continue;
        }

        revokedIds.push(key.id);
      } catch (error) {
        console.error('Failed to delete API key:', error);
        failureMessage = failureMessage || 'Failed to revoke API key';
      }
    }

    if (revokedIds.length > 0) {
      setApiKeys((currentKeys) =>
        currentKeys.filter((key) => !revokedIds.includes(key.id))
      );
      setSelectedKeyIds((currentIds) =>
        currentIds.filter((id) => !revokedIds.includes(id))
      );
      toast.success(
        `Revoked ${revokedIds.length} key${revokedIds.length !== 1 ? 's' : ''}`
      );
    }

    if (failureMessage) {
      toast.error(failureMessage);
    }

    setKeysToDelete([]);
    setDeletingKeyIds([]);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('API key copied');
    } catch {
      toast.error('Failed to copy API key');
    }
  };

  const resetDialog = () => {
    setNewKey(null);
    setSelectedApp('');
    setKeyName('');
    setExpiresInDays('');
    setError('');
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const visibleApiKeys = [...apiKeys]
    .filter((key) => {
      const expired = isExpired(key.expiresAt);

      if (statusFilter === 'active' && expired) return false;
      if (statusFilter === 'expired' && !expired) return false;

      if (!normalizedSearch) return true;

      return [
        key.name,
        key.app.name,
        key.app.slug,
        key.createdBy.username,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        case 'name':
          return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
        case 'app':
          return left.app.name.localeCompare(right.app.name, undefined, { sensitivity: 'base' });
        case 'expires': {
          const leftValue = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.POSITIVE_INFINITY;
          const rightValue = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.POSITIVE_INFINITY;
          return leftValue - rightValue;
        }
        default:
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    });
  const hasViewFilters =
    normalizedSearch.length > 0 || statusFilter !== 'all' || sortBy !== 'recent';
  const resultLabel =
    visibleApiKeys.length === apiKeys.length
      ? `${apiKeys.length} key${apiKeys.length !== 1 ? 's' : ''}`
      : `Showing ${visibleApiKeys.length} of ${apiKeys.length} keys`;

  const resetViewFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('recent');
    setSelectedKeyIds([]);
  };

  const visibleSelectedKeys = visibleApiKeys.filter((key) =>
    selectedKeyIds.includes(key.id)
  );
  const allVisibleSelected =
    visibleApiKeys.length > 0 && visibleSelectedKeys.length === visibleApiKeys.length;

  const toggleKeySelection = (keyId: string) => {
    setSelectedKeyIds((currentIds) =>
      currentIds.includes(keyId)
        ? currentIds.filter((id) => id !== keyId)
        : [...currentIds, keyId]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedKeyIds((currentIds) => {
      const otherSelectedIds = currentIds.filter(
        (id) => !visibleApiKeys.some((key) => key.id === id)
      );

      return allVisibleSelected
        ? otherSelectedIds
        : [...otherSelectedIds, ...visibleApiKeys.map((key) => key.id)];
    });
  };

  const clearSelection = () => {
    setSelectedKeyIds([]);
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
      <ConfirmDialog
        open={keysToDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setKeysToDelete([]);
          }
        }}
        title="Revoke API key"
        description={
          keysToDelete.length > 1
            ? `Revoke ${keysToDelete.length} selected API keys? Clients using them will lose access immediately.`
            : keysToDelete[0]
              ? `Revoke "${keysToDelete[0].name}"? Clients using this key will lose access immediately.`
              : 'Revoke this API key?'
        }
        confirmLabel={keysToDelete.length > 1 ? 'Revoke keys' : 'Revoke key'}
        pendingLabel="Revoking..."
        onConfirm={handleDelete}
        isPending={deletingKeyIds.length > 0}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage access keys for private release downloads
          </p>
        </div>
        <Dialog 
          open={createDialogOpen} 
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for accessing private releases
              </DialogDescription>
            </DialogHeader>

            {newKey ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Save this key now!</strong> It will not be shown again.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input 
                    value={newKey} 
                    readOnly 
                    className="font-mono text-sm" 
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newKey)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    resetDialog();
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="app">App</Label>
                  <Select value={selectedApp} onValueChange={setSelectedApp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an app" />
                    </SelectTrigger>
                    <SelectContent>
                      {apps.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No apps found
                        </div>
                      ) : (
                        apps.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., Production Server"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Expires In (days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    min="1"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Leave empty for no expiration"
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(k => !isExpired(k.expiresAt)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Keys</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(k => isExpired(k.expiresAt)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {apiKeys.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key-search">Search keys</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="api-key-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by key name, app, slug, or creator"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 lg:w-52">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All keys</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="expired">Expired only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:w-56">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort keys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="app">App name</SelectItem>
                  <SelectItem value="expires">Expires soonest</SelectItem>
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

      {visibleApiKeys.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {visibleSelectedKeys.length > 0
                    ? `${visibleSelectedKeys.length} key${visibleSelectedKeys.length !== 1 ? 's' : ''} selected`
                    : 'Select keys to enable bulk revoke'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Manage API keys in batches without leaving the list.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={toggleSelectAllVisible}
                  disabled={deletingKeyIds.length > 0}
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {allVisibleSelected
                    ? 'Clear visible'
                    : `Select visible (${visibleApiKeys.length})`}
                </Button>
                {visibleSelectedKeys.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                    disabled={deletingKeyIds.length > 0}
                  >
                    Clear selection
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setKeysToDelete(visibleSelectedKeys)}
                  disabled={visibleSelectedKeys.length === 0 || deletingKeyIds.length > 0}
                >
                  Revoke selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>All API Keys</CardTitle>
          <CardDescription>
            {resultLabel} across all apps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No API Keys</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                Create API keys to allow secure access to private releases.
              </p>
              <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Your First Key
              </Button>
            </div>
          ) : (
            visibleApiKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No API keys match your filters</h3>
                <p className="mt-1 max-w-sm text-muted-foreground">
                  Adjust the search, status, or sort order to see more results.
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={resetViewFilters}>
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            ) : (
            <>
              <div className="space-y-3 md:hidden">
                {visibleApiKeys.map((key) => {
                  const isSelected = selectedKeyIds.includes(key.id);

                  return (
                  <div
                    key={key.id}
                    className={`rounded-lg border p-4 ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            aria-label={`Select API key ${key.name}`}
                            checked={isSelected}
                            onChange={() => toggleKeySelection(key.id)}
                            disabled={deletingKeyIds.length > 0}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <p className="truncate font-medium">{key.name}</p>
                        </div>
                        <Link
                          href={`/dashboard/releases?appId=${key.app.id}`}
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Package className="h-3 w-3" />
                          {key.app.name}
                        </Link>
                      </div>

                      {isExpired(key.expiresAt) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Created By</p>
                        <p className="mt-1 font-medium">{key.createdBy.username}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                        <p className="mt-1 font-medium">{formatDate(key.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expires</p>
                        <p className="mt-1 font-medium">
                          {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full text-destructive hover:text-destructive"
                      onClick={() => setKeysToDelete([key])}
                      disabled={deletingKeyIds.length > 0}
                    >
                      Revoke Key
                    </Button>
                  </div>
                )})}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          aria-label="Select all visible API keys"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          disabled={deletingKeyIds.length > 0}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleApiKeys.map((key) => {
                      const isSelected = selectedKeyIds.includes(key.id);

                      return (
                      <TableRow key={key.id} className={isSelected ? 'bg-primary/5' : undefined}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select API key ${key.name}`}
                            checked={isSelected}
                            onChange={() => toggleKeySelection(key.id)}
                            disabled={deletingKeyIds.length > 0}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{key.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/dashboard/releases?appId=${key.app.id}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Package className="h-3 w-3" />
                            {key.app.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {key.createdBy.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(key.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                        </TableCell>
                        <TableCell>
                          {isExpired(key.expiresAt) ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setKeysToDelete([key])}
                              className="text-destructive hover:text-destructive"
                              title="Revoke Key"
                              disabled={deletingKeyIds.length > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
