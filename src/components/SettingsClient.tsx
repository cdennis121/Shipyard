'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function SettingsClient() {
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    message: string;
    orphanedFiles: string[];
    deletedFiles: string[];
    errors: string[];
  } | null>(null);

  const handlePreviewCleanup = async () => {
    setCleanupLoading(true);
    setCleanupResult(null);

    try {
      const response = await fetch('/api/cleanup');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview cleanup');
      }

      setCleanupResult({
        message: `Found ${data.count} orphaned files`,
        orphanedFiles: data.orphanedFiles,
        deletedFiles: [],
        errors: [],
      });
    } catch (err) {
      setCleanupResult({
        message: err instanceof Error ? err.message : 'An error occurred',
        orphanedFiles: [],
        deletedFiles: [],
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleRunCleanup = async () => {
    if (!confirm('Are you sure you want to delete all orphaned files? This cannot be undone.')) {
      return;
    }

    setCleanupLoading(true);

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run cleanup');
      }

      setCleanupResult({
        message: data.message,
        orphanedFiles: data.orphanedFiles,
        deletedFiles: data.deletedFiles,
        errors: data.errors,
      });
    } catch (err) {
      setCleanupResult({
        message: err instanceof Error ? err.message : 'An error occurred',
        orphanedFiles: [],
        deletedFiles: [],
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Cleanup</CardTitle>
          <CardDescription>
            Remove orphaned files from S3 storage that are no longer associated with any release
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewCleanup}
              disabled={cleanupLoading}
            >
              {cleanupLoading ? 'Scanning...' : 'Preview Cleanup'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRunCleanup}
              disabled={cleanupLoading}
            >
              {cleanupLoading ? 'Running...' : 'Run Cleanup'}
            </Button>
          </div>

          {cleanupResult && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>{cleanupResult.message}</AlertDescription>
              </Alert>

              {cleanupResult.orphanedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Orphaned Files:</p>
                  <div className="max-h-48 overflow-auto bg-muted rounded-md p-2">
                    {cleanupResult.orphanedFiles.map((file) => (
                      <div key={file} className="text-xs font-mono py-0.5">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cleanupResult.deletedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Deleted Files:</p>
                    <Badge variant="secondary">{cleanupResult.deletedFiles.length}</Badge>
                  </div>
                </div>
              )}

              {cleanupResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  {cleanupResult.errors.map((error, i) => (
                    <Alert key={i} variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Note: Automatic cleanup runs daily at 2:00 AM server time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Information</CardTitle>
          <CardDescription>URL structure for your multi-app update server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs mb-3">
                Replace <code className="text-primary">{'{app-slug}'}</code> with your app&apos;s unique slug (e.g., &quot;my-electron-app&quot;)
              </p>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Update Manifest (Stable):</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">/updates/{'{app-slug}'}/latest.yml</code>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Update Manifest (Beta):</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">/updates/{'{app-slug}'}/beta.yml</code>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Update Manifest (Alpha):</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">/updates/{'{app-slug}'}/alpha.yml</code>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">File Download:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">/updates/{'{app-slug}'}/download/{'{filename}'}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electron Configuration</CardTitle>
          <CardDescription>
            Add this to your Electron app&apos;s electron-builder configuration (package.json or electron-builder.yml)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Basic Configuration (Public Releases)</p>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`// In package.json under "build" or in electron-builder.yml
{
  "publish": {
    "provider": "generic",
    "url": "https://your-server.com/updates/your-app-slug",
    "channel": "latest"
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Private Releases with API Key</CardTitle>
          <CardDescription>
            Configure electron-updater to use an API key for private/restricted releases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">1. electron-builder Configuration</p>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`{
  "publish": {
    "provider": "generic",
    "url": "https://your-server.com/updates/your-app-slug",
    "channel": "latest"
  }
}`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">2. Configure autoUpdater in Main Process</p>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`import { autoUpdater } from 'electron-updater';

// Set API key for private releases
autoUpdater.requestHeaders = {
  'X-API-Key': 'your-api-key-here'
};

// Or use Authorization header
autoUpdater.requestHeaders = {
  'Authorization': 'Bearer your-api-key-here'
};

// Check for updates
autoUpdater.checkForUpdatesAndNotify();`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">3. Dynamic API Key (from environment or config)</p>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';

const store = new Store();

// Get API key from secure storage
const apiKey = store.get('updateApiKey') || process.env.UPDATE_API_KEY;

if (apiKey) {
  autoUpdater.requestHeaders = {
    'X-API-Key': apiKey
  };
}

autoUpdater.checkForUpdatesAndNotify();`}
            </pre>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Security Note:</strong> Never hardcode API keys in your source code. Use environment variables 
              or secure storage like <code className="bg-muted px-1 rounded">electron-store</code> with encryption enabled.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Switching</CardTitle>
          <CardDescription>
            Allow users to switch between stable, beta, and alpha channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`import { autoUpdater } from 'electron-updater';

// Function to switch update channels
function setUpdateChannel(channel: 'latest' | 'beta' | 'alpha') {
  // Update the channel
  autoUpdater.channel = channel;
  
  // Or update the full URL
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: \`https://your-server.com/updates/your-app-slug\`,
    channel: channel
  });
  
  // Check for updates on new channel
  autoUpdater.checkForUpdates();
}

// Example: User selects beta channel
setUpdateChannel('beta');`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
