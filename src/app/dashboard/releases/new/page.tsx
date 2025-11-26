'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

export default function NewReleasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  
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

  useEffect(() => {
    async function loadApps() {
      try {
        const response = await fetch('/api/apps');
        if (response.ok) {
          const data = await response.json();
          setApps(data);
          // Auto-select if only one app
          if (data.length === 1) {
            setFormData(f => ({ ...f, appId: data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load apps:', err);
      } finally {
        setLoadingApps(false);
      }
    }
    loadApps();
  }, []);

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
                  <a href="/dashboard/apps" className="text-primary underline">
                    Go to Apps →
                  </a>
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
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

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Release'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
