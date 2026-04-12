import { cache } from "react";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authCallbacks } from "@/lib/auth-callbacks";
import { getSessionFromCookies } from "@/lib/session-from-cookies";

const nextAuth = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        if (user.status === "SUSPENDED") {
          throw new Error("Your account has been suspended. Contact support.");
        }
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in.");
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          impersonatingFrom: null as string | null,
        };
      },
    }),
    Credentials({
      id: "impersonate",
      name: "Impersonate",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const { verifyImpersonationToken } = await import("@/lib/impersonate-token");
        const token = credentials?.token as string | undefined;
        if (!token) return null;
        const v = verifyImpersonationToken(token);
        if (!v) return null;
        const user = await prisma.user.findUnique({ where: { id: v.userId } });
        if (!user || user.status === "SUSPENDED") return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          impersonatingFrom: v.adminId,
        };
      },
    }),
    Credentials({
      id: "login-handoff",
      name: "Login handoff",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const { verifyLoginHandoffToken } = await import("@/lib/impersonate-token");
        const token = credentials?.token as string | undefined;
        if (!token) return null;
        const v = verifyLoginHandoffToken(token);
        if (!v) return null;
        const user = await prisma.user.findUnique({ where: { id: v.userId } });
        if (!user || user.status === "SUSPENDED" || !user.emailVerified) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          impersonatingFrom: null as string | null,
        };
      },
    }),
    Credentials({
      id: "exit-impersonate",
      name: "Exit impersonate",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const { verifyExitImpersonationToken } = await import("@/lib/impersonate-token");
        const token = credentials?.token as string | undefined;
        if (!token) return null;
        const v = verifyExitImpersonationToken(token);
        if (!v) return null;
        const admin = await prisma.user.findUnique({ where: { id: v.adminId } });
        if (!admin || admin.status === "SUSPENDED") return null;
        if (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN") return null;
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatarUrl: admin.avatarUrl,
          impersonatingFrom: null as string | null,
        };
      },
    }),
  ],
  callbacks: authCallbacks,
});

const { handlers, auth: authInternal, signIn, signOut } = nextAuth;

/**
 * Prefer decoding the JWT from the incoming Cookie header so Server Components and
 * Route Handlers work even when NEXTAUTH_URL's port/host does not match the browser
 * (Auth.js' default `auth()` does an internal fetch to AUTH_URL and returns null).
 */
const authCached = cache(async (): Promise<Session | null> => {
  const fromCookies = await getSessionFromCookies();
  if (fromCookies) return fromCookies;
  return (authInternal as () => Promise<Session | null>)();
});

/** @see https://authjs.dev — overloads: `auth()`, `auth(req)`, middleware wrapper, etc. */
export async function auth(...args: unknown[]): Promise<Session | null> {
  if (args.length === 0) return authCached();
  return (authInternal as (...a: unknown[]) => Promise<Session | null>)(...args);
}

export { handlers, signIn, signOut };
