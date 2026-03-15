import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Anchor, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = {
    name: session.user.name,
    role: session.user.role,
    tenantName: session.user.tenantName,
    tenantSlug: session.user.tenantSlug,
  };
  const handleSignOut = async () => {
    'use server';
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        user={user}
        onSignOut={handleSignOut}
        className="sticky top-0 hidden h-screen lg:flex"
      />

      {/* Mobile Header + Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar
                user={user}
                onSignOut={handleSignOut}
                className="h-full border-r-0"
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-semibold">{session.user.tenantName}</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
