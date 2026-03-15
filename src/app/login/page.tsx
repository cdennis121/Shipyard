'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Anchor } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const prefilledTenant = searchParams.get('tenant') || '';
  const prefilledUsername = searchParams.get('username') || '';
  const { data: session, status } = useSession();
  
  const [tenant, setTenant] = useState(prefilledTenant);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTenant(prefilledTenant);
  }, [prefilledTenant]);

  useEffect(() => {
    setUsername(prefilledUsername);
  }, [prefilledUsername]);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        tenant,
        username,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username or password');
      } else if (result?.url) {
        const redirectUrl = new URL(result.url, window.location.origin);

        if (redirectUrl.origin === window.location.origin) {
          router.replace(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`);
          router.refresh();
        } else {
          window.location.href = redirectUrl.toString();
        }
      } else {
        setError('Sign in did not complete. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Anchor className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Shipyard
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to manage your Electron app updates
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
            <Label htmlFor="tenant">Brand URL</Label>
            <Input
              id="tenant"
              type="text"
              value={tenant}
              onChange={(e) => setTenant(e.target.value.toLowerCase())}
              placeholder="your-brand"
              required
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !tenant}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need a branded workspace?{' '}
          <a href="/signup" className="font-medium text-primary hover:underline">
            Create one
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
