'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Anchor } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SignupPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBrandNameChange = (value: string) => {
    setBrandName(value);
    if (!tenantSlug) {
      setTenantSlug(slugify(value));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          tenantSlug,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      router.push(
        `/login?tenant=${encodeURIComponent(data.tenant.slug)}&username=${encodeURIComponent(username)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Anchor className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Create Your Branded Workspace
          </CardTitle>
          <CardDescription className="text-center">
            Provision a hosted demo tenant and start publishing updates under your own brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="brandName">Brand name</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(event) => handleBrandNameChange(event.target.value)}
                placeholder="Acme Updates"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Brand URL</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(slugify(event.target.value))}
                placeholder="acme-updates"
                required
              />
              <p className="text-xs text-muted-foreground">
                Users will sign in with this brand URL plus their username.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Admin username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="founder"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !brandName || !tenantSlug || !username || password.length < 8}
            >
              {loading ? 'Creating workspace...' : 'Create workspace'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have a workspace?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
