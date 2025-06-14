import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";
import { verifyPassword } from "~/utils/password";

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
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is where you need to retrieve user data 
        // to verify with credentials
        // Docs: https://next-auth.js.org/providers/credentials
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        // For demo purposes, we'll verify the password
        const isValidPassword = verifyPassword(credentials.password, user.password);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          image: user.image || "",
        };
      }
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email || "";
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
