import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

type RouteParams = Promise<{ id: string }>;

// Helper to get current user from database
async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  // First try by ID
  if (session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user) return user;
  }

  // Fallback: find by username (handles case where session has old ID after DB reset)
  if (session.user.name) {
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
    });
    if (user) return user;
  }

  return null;
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
