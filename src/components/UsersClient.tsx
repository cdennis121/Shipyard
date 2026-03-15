'use client';

import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, X } from 'lucide-react';
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
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readErrorMessage } from '@/lib/http';

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: Date | string;
  _count: {
    apiKeys: number;
  };
}

interface UsersClientProps {
  users: User[];
  currentUserId: string;
}

export function UsersClient({ users: initialUsers, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin',
  });
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const handleCreate = async () => {
    if (!formData.username || !formData.password) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setFormData({ username: '', password: '', role: 'admin' });
      setOpen(false);
      toast.success(`Created ${formData.username}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (user: User) => {
    if (user.id === currentUserId) {
      toast.error('You cannot delete your own account');
      return;
    }

    setUserToDelete(user);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setDeletingUserId(userToDelete.id);

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete user'));
      }

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userToDelete.id));
      toast.success(`Deleted ${userToDelete.username}`);
      setUserToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeletingUserId(null);
    }
  };

  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const visibleUsers = [...users]
    .filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (!normalizedSearch) return true;

      return [user.username, user.role]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        case 'username':
          return left.username.localeCompare(right.username, undefined, { sensitivity: 'base' });
        case 'api-keys':
          return (
            right._count.apiKeys - left._count.apiKeys ||
            left.username.localeCompare(right.username, undefined, { sensitivity: 'base' })
          );
        default:
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    });
  const hasViewFilters =
    normalizedSearch.length > 0 || roleFilter !== 'all' || sortBy !== 'recent';
  const resultLabel =
    visibleUsers.length === users.length
      ? `${users.length} user${users.length !== 1 ? 's' : ''}`
      : `Showing ${visibleUsers.length} of ${users.length} users`;

  const resetViewFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setSortBy('recent');
  };

  return (
    <Card>
      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
        title="Delete user"
        description={
          userToDelete
            ? `Delete "${userToDelete.username}"? Their API keys and ownership links will be removed.`
            : 'Delete this user?'
        }
        confirmLabel="Delete user"
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
        isPending={deletingUserId === userToDelete?.id}
      />

      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? 's' : ''} in this tenant
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>Add a new user to this branded workspace</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={loading || !formData.username || !formData.password}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="user-search">Search users</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by username or role"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2 lg:w-48">
            <Label>Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:w-56">
            <Label>Sort by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="username">Username (A-Z)</SelectItem>
                <SelectItem value="api-keys">Most API keys</SelectItem>
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
        </div>

        {visibleUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No users match your filters</h3>
            <p className="mt-1 max-w-sm text-muted-foreground">
              Try a broader search or clear the current role and sort settings.
            </p>
            <Button variant="outline" className="mt-4 gap-2" onClick={resetViewFilters}>
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visibleUsers.map((user) => (
              <div key={user.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{user.username}</p>
                      {user.id === currentUserId && <Badge variant="secondary">You</Badge>}
                    </div>
                    <Badge variant="outline" className="mt-2">{user.role}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">API Keys</p>
                    <p className="mt-1 font-medium">{user._count.apiKeys}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                    <p className="mt-1 font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => requestDelete(user)}
                  disabled={user.id === currentUserId}
                >
                  Delete User
                </Button>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>API Keys</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.username}
                      {user.id === currentUserId && (
                        <Badge variant="secondary" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user._count.apiKeys}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => requestDelete(user)}
                        disabled={user.id === currentUserId}
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
  );
}
