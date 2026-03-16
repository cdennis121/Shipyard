'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FREE_PLAN_MAX_APPS,
  FREE_PLAN_MAX_RELEASES_PER_APP,
} from '@/lib/tenant-access';

function SignupForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [limits, setLimits] = useState({
    maxAppsPerUser: FREE_PLAN_MAX_APPS,
    maxReleasesPerApp: FREE_PLAN_MAX_RELEASES_PER_APP,
    allowPublicSignup: true,
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [router, session, status]);

  useEffect(() => {
    async function loadLimits() {
      try {
        const response = await fetch('/api/settings');

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setLimits(data);
      } catch {
        // Ignore and keep defaults for the marketing copy.
      } finally {
        setSettingsLoaded(true);
      }
    }

    void loadLimits();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!limits.allowPublicSignup) {
      setError('Public signup is currently disabled');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create account');
      }

      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.replace('/login');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Anchor className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-center text-2xl font-bold">Create Account</CardTitle>
        <CardDescription className="text-center">
          {limits.allowPublicSignup
            ? `Free hosting includes ${limits.maxAppsPerUser} app${
                limits.maxAppsPerUser === 1 ? '' : 's'
              } and ${limits.maxReleasesPerApp} releases per app.`
            : 'Public signup is currently disabled by the administrator.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!limits.allowPublicSignup && settingsLoaded && (
            <Alert>
              <AlertDescription>
                New registrations are disabled right now. Existing users can still sign in.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
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
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !limits.allowPublicSignup}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
