import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;
        if (user.deletedAt) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          isPlatformAdmin: user.isPlatformAdmin,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
    newUser: '/onboarding',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.isPlatformAdmin = user.isPlatformAdmin ?? false;
      }
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isPlatformAdmin = token.isPlatformAdmin ?? false;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        // Sync avatar from Google profile
        await prisma.user.update({
          where: { email: user.email },
          data: {
            avatarUrl: user.image ?? undefined,
            name: user.name ?? undefined,
          },
        }).catch(() => {});
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create a personal workspace for new users
      try {
        const workspace = await prisma.workspace.create({
          data: {
            name: `${user.name || user.email.split('@')[0]}'s Workspace`,
            members: {
              create: { userId: user.id, role: 'ADMIN' },
            },
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            action: 'workspace.created',
            resourceType: 'workspace',
            resourceId: workspace.id,
          },
        });
      } catch (e) {
        console.error('Failed to create workspace for new user:', e);
      }
    },
  },
};

export default NextAuth(authOptions);
