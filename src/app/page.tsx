import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Shipyard
        </h1>
        <p className="text-xl text-muted-foreground">
          A self-hosted update server for Electron applications with multi-channel
          support, staged rollouts, and a management dashboard.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>

        <div className="pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-lg border">
              <h3 className="font-medium">Multi-Channel</h3>
              <p className="text-sm text-muted-foreground">
                Support for latest, beta, and alpha release channels
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <h3 className="font-medium">Staged Rollouts</h3>
              <p className="text-sm text-muted-foreground">
                Gradually roll out updates to a percentage of users
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <h3 className="font-medium">Private Releases</h3>
              <p className="text-sm text-muted-foreground">
                Protect releases with API keys for controlled access
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
