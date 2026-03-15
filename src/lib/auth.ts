import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import prisma from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        tenant: { label: 'Tenant', type: 'text' },
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.tenant || !credentials?.username || !credentials?.password) {
          return null;
        }

        const tenantSlug = String(credentials.tenant).trim().toLowerCase();
        const username = String(credentials.username).trim();

        const user = await prisma.user.findFirst({
          where: {
            username,
            tenant: {
              slug: tenantSlug,
            },
          },
          include: {
            tenant: true,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.username,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.tenantSlug = (user as { tenantSlug?: string }).tenantSlug;
        token.tenantName = (user as { tenantName?: string }).tenantName;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.tenantName = token.tenantName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
