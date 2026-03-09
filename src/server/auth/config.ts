import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      businessSlug: string | null;
      subscriptionStatus: string;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // Estos campos custom se persistiran en el JWT
          businessSlug: user.businessSlug,
          subscriptionStatus: user.subscriptionStatus,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    newUser: "/registro",
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // user.id va en token.sub (campo estandar JWT)
        token.sub = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as Record<string, unknown>;
        token["businessSlug"] = u["businessSlug"] as string | null;
        token["subscriptionStatus"] = u["subscriptionStatus"] as string;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub ?? "",
          businessSlug: (token["businessSlug"] as string | null) ?? null,
          subscriptionStatus: (token["subscriptionStatus"] as string) ?? "trial",
        },
      };
    },
  },
} satisfies NextAuthConfig;
