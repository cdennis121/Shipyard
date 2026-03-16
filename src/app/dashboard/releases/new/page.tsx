'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppWindow, Loader2 } from 'lucide-react';

interface App {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  _count?: {
    releases: number;
  };
}

export default function NewReleasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const preselectedAppId = searchParams.get('appId');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [maxReleasesPerApp, setMaxReleasesPerApp] = useState(5);
  
  const [formData, setFormData] = useState({
    appId: '',
    version: '',
    name: '',
    notes: '',
    channel: 'latest',
    platform: 'windows',
    stagingPercentage: 100,
    isPublic: true,
    published: false,
  });
  const selectedApp = apps.find((app) => app.id === formData.appId);
  const releaseLimitReached =
    session?.user.role !== 'admin' &&
    (selectedApp?._count?.releases ?? 0) >= maxReleasesPerApp;

  useEffect(() => {
    async function loadApps() {
      try {
        const [appsResponse, settingsResponse] = await Promise.all([
          fetch('/api/apps'),
          fetch('/api/settings'),
        ]);

        if (appsResponse.ok) {
          const data = await appsResponse.json();
          setApps(data);
          const requestedApp = data.find((app: App) => app.id === preselectedAppId);

          if (requestedApp) {
            setFormData((current) => ({ ...current, appId: requestedApp.id }));
          } else if (data.length === 1) {
            // Auto-select if only one app
            setFormData((current) => ({ ...current, appId: data[0].id }));
          }
        }

        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setMaxReleasesPerApp(settings.maxReleasesPerApp);
        }
      } catch (err) {
        console.error('Failed to load apps:', err);
      } finally {
        setLoadingApps(false);
      }
    }
    loadApps();
  }, [preselectedAppId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.appId) {
      setError('Please select an application');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create release');
      }

      const release = await response.json();
      router.push(`/dashboard/releases/${release.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Release</h1>
        <p className="text-muted-foreground">
          Create a new release for your application
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
            <CardDescription>
              Basic information about the release
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {apps.length === 0 && !loadingApps && (
              <Alert>
                <AlertDescription>
                  You need to create an app first before creating releases.{' '}
                  <Link href="/dashboard/apps" className="text-primary underline">
                    Go to Apps →
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {selectedApp && session?.user.role !== 'admin' && (
              <Alert>
                <AlertDescription>
                  Free plan usage for {selectedApp.name}: {selectedApp._count?.releases ?? 0} /{' '}
                  {maxReleasesPerApp} releases.
                </AlertDescription>
              </Alert>
            )}

            {releaseLimitReached && (
              <Alert variant="destructive">
                <AlertDescription>
                  This app has reached the free plan limit of {maxReleasesPerApp}{' '}
                  releases.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="appId">Application *</Label>
              {loadingApps ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading apps...
                </div>
              ) : (
                <Select
                  value={formData.appId}
                  onValueChange={(value) => setFormData({ ...formData, appId: value })}
                  disabled={apps.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an app" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        <div className="flex items-center gap-2">
                          {app.icon ? (
                            <img src={app.icon} alt="" className="w-4 h-4 rounded" />
                          ) : (
                            <AppWindow className="h-4 w-4" />
                          )}
                          {app.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Release Name</Label>
                <Input
                  id="name"
                  placeholder="Initial Release"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Release Notes</Label>
              <Textarea
                id="notes"
                placeholder="What's new in this release..."
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
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
                <Label htmlFor="platform">Platform *</Label>
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Staged Rollout: {formData.stagingPercentage}%</Label>
                <Slider
                  value={[formData.stagingPercentage]}
                  onValueChange={([value]) => setFormData({ ...formData, stagingPercentage: value })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of users who will receive this update
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Release</Label>
                <p className="text-xs text-muted-foreground">
                  Private releases require an API key to download
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="published">Publish Immediately</Label>
                <p className="text-xs text-muted-foreground">
                  Make this release available for download immediately
                </p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || releaseLimitReached}
                className="w-full sm:w-auto"
              >
                {loading ? 'Creating...' : 'Create Release'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
