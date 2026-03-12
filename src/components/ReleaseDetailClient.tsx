'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/FileUpload';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';

interface ReleaseFile {
  id: string;
  filename: string;
  s3Key: string;
  sha512: string;
  size: number;
  arch: string | null;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    username: string;
  };
}

interface Release {
  id: string;
  version: string;
  name: string | null;
  notes: string | null;
  channel: string;
  platform: string;
  stagingPercentage: number;
  isPublic: boolean;
  published: boolean;
  releaseDate: string;
  createdAt: string;
  files: ReleaseFile[];
  app: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    downloadStats: number;
    rolloutTracking: number;
  };
}

interface ReleaseDetailClientProps {
  releaseId: string;
}

export function ReleaseDetailClient({ releaseId }: ReleaseDetailClientProps) {
  const router = useRouter();
  const [release, setRelease] = useState<Release | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ReleaseFile | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingRelease, setDeletingRelease] = useState(false);

  const [formData, setFormData] = useState({
    version: '',
    name: '',
    notes: '',
    channel: '',
    platform: '',
    stagingPercentage: 100,
    isPublic: true,
    published: false,
  });

  const fetchRelease = useCallback(async () => {
    try {
      const [releaseResponse, keysResponse] = await Promise.all([
        fetch(`/api/releases/${releaseId}`),
        fetch(`/api/releases/${releaseId}/keys`),
      ]);
      if (!releaseResponse.ok) {
        throw new Error('Failed to fetch release');
      }
      const data = await releaseResponse.json();
      setRelease(data);
      
      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setApiKeys(keysData);
      }
      
      setFormData({
        version: data.version,
        name: data.name || '',
        notes: data.notes || '',
        channel: data.channel,
        platform: data.platform,
        stagingPercentage: data.stagingPercentage,
        isPublic: data.isPublic,
        published: data.published,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    fetchRelease();
  }, [fetchRelease]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to save'));
      }

      await fetchRelease();
      toast.success('Release updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeletingRelease(true);

    try {
      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete release'));
      }

      toast.success('Release deleted');
      router.push('/dashboard/releases');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingRelease(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    setDeletingFileId(fileToDelete.id);

    try {
      const response = await fetch(`/api/releases/${releaseId}/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete file'));
      }

      await fetchRelease();
      toast.success(`Deleted ${fileToDelete.filename}`);
      setFileToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeletingFileId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!release) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Release not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete release"
        description="Delete this release? This action cannot be undone and all associated files will be removed."
        confirmLabel="Delete release"
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
        isPending={deletingRelease}
      />

      <ConfirmDialog
        open={!!fileToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setFileToDelete(null);
          }
        }}
        title="Delete file"
        description={
          fileToDelete
            ? `Delete "${fileToDelete.filename}" from this release?`
            : 'Delete this file?'
        }
        confirmLabel="Delete file"
        pendingLabel="Deleting..."
        onConfirm={handleDeleteFile}
        isPending={deletingFileId === fileToDelete?.id}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{release.app.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">v{release.version}</h1>
            <Badge variant={release.published ? 'default' : 'secondary'}>
              {release.published ? 'Published' : 'Draft'}
            </Badge>
            {!release.isPublic && <Badge variant="outline">Private</Badge>}
          </div>
          <p className="text-muted-foreground">
            {release.channel} • {release.platform}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="details">
        <TabsList className="grid h-auto w-full grid-cols-2 md:inline-flex md:w-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files ({release.files.length})</TabsTrigger>
          <TabsTrigger value="keys">API Keys ({apiKeys.length})</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Release Details</CardTitle>
              <CardDescription>Edit release information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Release Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Release Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest (Stable)</SelectItem>
                      <SelectItem value="beta">Beta</SelectItem>
                      <SelectItem value="alpha">Alpha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="mac">macOS</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Staged Rollout: {formData.stagingPercentage}%</Label>
                  <Slider
                    value={[formData.stagingPercentage]}
                    onValueChange={([value]) => setFormData({ ...formData, stagingPercentage: value })}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>Public Release</Label>
                  <p className="text-xs text-muted-foreground">
                    Private releases require an API key
                  </p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>Published</Label>
                  <p className="text-xs text-muted-foreground">
                    Make available for download
                  </p>
                </div>
                <Switch
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <FileUpload
            releaseId={releaseId}
            channel={release.channel}
            platform={release.platform}
            version={release.version}
            onUploadComplete={fetchRelease}
          />

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>
                Files available for download in this release
              </CardDescription>
            </CardHeader>
            <CardContent>
              {release.files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files uploaded yet.
                </p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {release.files.map((file) => (
                      <div key={file.id} className="rounded-lg border p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium break-all">{file.filename}</p>
                            <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{file.arch || 'N/A'}</Badge>
                            <code className="rounded bg-muted px-2 py-1 text-xs">
                              {file.sha512.substring(0, 16)}...
                            </code>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setFileToDelete(file)}
                          >
                            Delete File
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Architecture</TableHead>
                          <TableHead>SHA512</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {release.files.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="font-medium">{file.filename}</TableCell>
                            <TableCell>{formatBytes(file.size)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{file.arch || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">
                                {file.sha512.substring(0, 16)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFileToDelete(file)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <ApiKeyManager
            releaseId={releaseId}
            apiKeys={apiKeys}
            onUpdate={fetchRelease}
          />
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Download and rollout statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                  <p className="text-2xl font-bold">
                    {release._count.downloadStats.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rollout Checks</p>
                  <p className="text-2xl font-bold">
                    {release._count.rolloutTracking.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
