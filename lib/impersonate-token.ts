import { createHmac, timingSafeEqual } from "crypto";

const IMPERSONATE_TTL_MS = 5 * 60 * 1000;
const LOGIN_TTL_MS = 60 * 1000;

function getSecret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function signPayload(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyPayload<T extends Record<string, unknown>>(
  token: string,
  guard: (o: Record<string, unknown>) => o is T
): T | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    if (!guard(raw)) return null;
    if (typeof raw.exp !== "number" || Date.now() > raw.exp) return null;
    return raw;
  } catch {
    return null;
  }
}

export function signImpersonationToken(adminId: string, userId: string): string {
  const exp = Date.now() + IMPERSONATE_TTL_MS;
  return signPayload({ t: "imp", adminId, userId, exp });
}

export function verifyImpersonationToken(
  token: string
): { adminId: string; userId: string } | null {
  const v = verifyPayload(token, (o): o is { t: string; adminId: string; userId: string; exp: number } =>
    o.t === "imp" && typeof o.adminId === "string" && typeof o.userId === "string"
  );
  if (!v) return null;
  return { adminId: v.adminId, userId: v.userId };
}

/** One-time login handoff after password verified in /api/auth/login (avoids double bcrypt in authorize). */
export function signLoginHandoffToken(userId: string): string {
  const exp = Date.now() + LOGIN_TTL_MS;
  return signPayload({ t: "login", userId, exp });
}

export function verifyLoginHandoffToken(token: string): { userId: string } | null {
  const v = verifyPayload(token, (o): o is { t: string; userId: string; exp: number } =>
    o.t === "login" && typeof o.userId === "string"
  );
  if (!v) return null;
  return { userId: v.userId };
}

export function signExitImpersonationToken(adminId: string): string {
  const exp = Date.now() + LOGIN_TTL_MS;
  return signPayload({ t: "exit", adminId, exp });
}

export function verifyExitImpersonationToken(token: string): { adminId: string } | null {
  const v = verifyPayload(token, (o): o is { t: string; adminId: string; exp: number } =>
    o.t === "exit" && typeof o.adminId === "string"
  );
  if (!v) return null;
  return { adminId: v.adminId };
}
