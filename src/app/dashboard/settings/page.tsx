import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/SettingsClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  
  if (session?.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Server configuration and maintenance
        </p>
      </div>

      <SettingsClient />
    </div>
  );
}
