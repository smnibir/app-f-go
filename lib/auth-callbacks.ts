import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Shared jwt/session callbacks — must be identical for main NextAuth and Edge middleware instance. */
export const authCallbacks = {
  async jwt({
    token,
    user,
    trigger,
    session,
  }: {
    token: JWT;
    user?: User;
    trigger?: "signIn" | "signUp" | "update";
    /** Passed from `update({ user: { ... } })` — Auth.js merges this before re-encoding the JWT */
    session?: unknown;
  }) {
    if (user) {
      const u = user as {
        id: string;
        role: Role;
        avatarUrl: string | null;
        impersonatingFrom?: string | null;
      };
      token.id = u.id;
      token.role = u.role;
      token.avatarUrl = u.avatarUrl ?? null;
      token.impersonatingFrom = u.impersonatingFrom ?? null;
    }
    if (trigger === "update" && session && typeof session === "object" && session !== null) {
      const s = session as {
        user?: {
          avatarUrl?: string | null;
          name?: string | null;
          email?: string | null;
        };
      };
      if (s.user?.avatarUrl !== undefined) token.avatarUrl = s.user.avatarUrl;
      if (s.user?.name !== undefined) token.name = s.user.name;
      if (s.user?.email !== undefined) token.email = s.user.email;
    }
    if (trigger === "update") {
      const uid = (token.id as string | undefined) || (token.sub as string | undefined);
      if (uid) {
        const row = await prisma.user.findUnique({
          where: { id: uid },
          select: { avatarUrl: true, name: true, email: true },
        });
        if (row) {
          token.avatarUrl = row.avatarUrl;
          token.name = row.name;
          token.email = row.email;
        }
      }
    }
    return token;
  },
  async session({ session, token }: { session: Session; token: JWT }) {
    if (session.user) {
      const id = (token.id as string | undefined) || (token.sub as string | undefined);
      if (id) session.user.id = String(id);
      session.user.role = token.role as Role;
      session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
      session.user.impersonatingFrom = (token.impersonatingFrom as string | null) ?? null;
    }
    return session;
  },
};
