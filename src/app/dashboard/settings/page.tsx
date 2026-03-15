import { getCurrentUser } from '@/lib/route-auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/SettingsClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  
  if (!user || !['admin', 'platform_admin'].includes(user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Branding for {user.tenant.name}
        </p>
      </div>

      <SettingsClient
        initialTenantName={user.tenant.name}
        tenantSlug={user.tenant.slug}
        canManageServer={user.role === 'platform_admin'}
      />
    </div>
  );
}
