import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { env } from "~/env";
import { verifyPassword } from "~/lib/crypto";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    organizationId: string | null;
  }
}

interface ExtendedJWT {
  sub?: string;
  role?: string;
  organizationId?: string | null;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentialsSchema.parse(credentials);

          const user = await db.user.findUnique({
            where: { email },
            include: { organization: true },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValidPassword = await verifyPassword(password, user.password);
          if (!isValidPassword) {
            return null;
          }

          // Only allow organization users to sign in
          if (!user.organizationId) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            organizationId: user.organizationId,
          };
        } catch (error) {
          console.error("💥 Auth error:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID ?? "",
      clientSecret: env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, check if user has an organization
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser?.organizationId) {
          return false; // Don't allow sign in if no organization
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub ?? "",
            role: (token as ExtendedJWT).role ?? "",
            organizationId: (token as ExtendedJWT).organizationId ?? null,
          },
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user && "role" in user && "organizationId" in user) {
        (token as ExtendedJWT).role = user.role;
        (token as ExtendedJWT).organizationId = user.organizationId;
      }

      return token;
    },
  },
} satisfies NextAuthConfig;
