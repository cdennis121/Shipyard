import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { CredentialsSignin } from 'next-auth';
import bcrypt from 'bcrypt';
import prisma from '@/lib/db';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getHeadersIp,
  recordLoginFailure,
} from '@/lib/auth-rate-limit';

class LoginRateLimitError extends CredentialsSignin {
  code = 'rate_limited';
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = String(credentials.username).trim();
        const ipAddress = getHeadersIp(request?.headers);
        const rateLimit = await checkLoginRateLimit(username, ipAddress);

        if (!rateLimit.allowed) {
          throw new LoginRateLimitError();
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          await recordLoginFailure(username, ipAddress);
          return null;
        }

        if (!user.isActive) {
          await recordLoginFailure(username, ipAddress);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          await recordLoginFailure(username, ipAddress);
          return null;
        }

        await clearLoginFailures(username, ipAddress);

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.isActive = (user as { isActive?: boolean }).isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
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
