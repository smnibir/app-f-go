import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

/**
 * Decode the Auth.js session JWT from a raw Cookie header.
 * Tries both secure and non-secure cookie names — same as middleware needs when
 * x-forwarded-proto / NODE_ENV disagree with the actual browser URL.
 */
export async function readAuthJwtFromCookieHeader(
  cookieHeader: string,
  secret: string
): Promise<JWT | null> {
  if (!cookieHeader.trim() || !secret) return null;

  const req = new Request("http://local.invalid", {
    headers: { cookie: cookieHeader },
  });

  let token = await getToken({ req, secret, secureCookie: false });
  if (!token) {
    token = await getToken({ req, secret, secureCookie: true });
  }
  return (token as JWT | null) ?? null;
}
