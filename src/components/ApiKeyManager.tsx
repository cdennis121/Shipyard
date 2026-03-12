'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';

interface ApiKey {
  id: string;
  name: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    username: string;
  };
}

interface ApiKeyManagerProps {
  releaseId: string;
  apiKeys: ApiKey[];
  onUpdate: () => void;
}

export function ApiKeyManager({ releaseId, apiKeys, onUpdate }: ApiKeyManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/releases/${releaseId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          expiresInDays: expiresInDays || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to create API key'));
      }

      const data = await response.json();
      setNewKey(data.key);
      setName('');
      setExpiresInDays('');
      onUpdate();
      toast.success('API key created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;

    setDeletingKeyId(keyToDelete.id);

    try {
      const response = await fetch(`/api/keys/${keyToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to revoke API key'));
      }

      onUpdate();
      toast.success(`Revoked ${keyToDelete.name}`);
      setKeyToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeletingKeyId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('API key copied');
    } catch {
      toast.error('Failed to copy API key');
    }
  };

  return (
    <Card>
      <ConfirmDialog
        open={!!keyToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setKeyToDelete(null);
          }
        }}
        title="Revoke API key"
        description={
          keyToDelete
            ? `Revoke "${keyToDelete.name}"? Any client using this release key will lose access immediately.`
            : 'Revoke this API key?'
        }
        confirmLabel="Revoke key"
        pendingLabel="Revoking..."
        onConfirm={handleDelete}
        isPending={deletingKeyId === keyToDelete?.id}
      />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage access keys for private release downloads
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Create Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for this release
                </DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Save this key now!</strong> It will not be shown again.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={newKey} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(newKey)}
                    >
                      Copy
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setNewKey(null);
                      setOpen(false);
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
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., CI/CD Pipeline"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresIn">Expires In (days)</Label>
                    <Input
                      id="expiresIn"
                      type="number"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Leave empty for no expiration"
                      min={1}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={loading || !name}
                  >
                    {loading ? 'Creating...' : 'Create Key'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No API keys created yet.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {apiKeys.map((key) => {
                const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                return (
                  <div key={key.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Created by {key.createdBy.username}
                        </p>
                      </div>
                      {key.expiresAt ? (
                        <Badge variant={isExpired ? 'destructive' : 'outline'}>
                          {isExpired ? 'Expired' : new Date(key.expiresAt).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Never</Badge>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                        <p className="mt-1 font-medium">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expires</p>
                        <p className="mt-1 font-medium">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => setKeyToDelete(key)}
                    >
                      Revoke
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => {
                    const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                    return (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>{key.createdBy.username}</TableCell>
                        <TableCell>
                          {new Date(key.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {key.expiresAt ? (
                            <Badge variant={isExpired ? 'destructive' : 'outline'}>
                              {isExpired ? 'Expired' : new Date(key.expiresAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Never</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setKeyToDelete(key)}
                          >
                            Revoke
                          </Button>
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
