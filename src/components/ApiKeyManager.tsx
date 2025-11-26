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
        throw new Error('Failed to create API key');
      }

      const data = await response.json();
      setNewKey(data.key);
      setName('');
      setExpiresInDays('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
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
                  <div className="flex gap-2">
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
                        onClick={() => handleDelete(key.id)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
