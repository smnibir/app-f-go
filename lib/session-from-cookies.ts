import { cookies } from "next/headers";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";
import { readAuthJwtFromCookieHeader } from "@/lib/read-auth-jwt";

function jwtToSession(t: JWT): Session | null {
  const id = t.id ?? t.sub;
  const email = t.email;
  if (id == null || email == null || typeof email !== "string") {
    return null;
  }

  const expSec = typeof t.exp === "number" ? t.exp : undefined;
  const expires = expSec
    ? new Date(expSec * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    expires,
    user: {
      id: String(id),
      email,
      name: t.name ?? undefined,
      role: t.role as Role,
      avatarUrl: (t.avatarUrl as string | null) ?? null,
      impersonatingFrom: (t.impersonatingFrom as string | null) ?? null,
    },
  } as Session;
}

/**
 * Session for Server Components / Route Handlers without relying on Auth.js
 * internal fetch to NEXTAUTH_URL (which breaks when the port differs from the browser).
 */
export async function getSessionFromCookies(): Promise<Session | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const store = cookies();
    const all = store.getAll();
    if (all.length === 0) return null;

    const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join("; ");
    const token = await readAuthJwtFromCookieHeader(cookieHeader, secret);
    if (!token) return null;
    return jwtToSession(token);
  } catch {
    return null;
  }
}
