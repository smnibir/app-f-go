import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Open GET /api/health after deploy to verify env + DB (no secrets exposed).
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasAuthSecret = Boolean(
    (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim()
  );
  const publicUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const hasPublicUrl = Boolean(publicUrl);

  let db: "ok" | "skipped" | "error" = "skipped";
  let dbMessage: string | undefined;

  if (hasDatabaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
    } catch (e) {
      db = "error";
      dbMessage = e instanceof Error ? e.message : String(e);
    }
  } else {
    dbMessage = "DATABASE_URL is not set in Vercel environment variables.";
  }

  const ok = hasDatabaseUrl && hasAuthSecret && db === "ok" && hasPublicUrl;

  return NextResponse.json(
    {
      ok,
      checks: {
        hasDatabaseUrl,
        hasAuthSecret,
        hasPublicUrl,
        publicUrlHint: publicUrl || "Set NEXTAUTH_URL to https://your-app.vercel.app (or your domain)",
      },
      database: db,
      error: ok ? undefined : dbMessage,
      fix: ok
        ? undefined
        : [
            "Vercel → Project → Settings → Environment Variables (Production):",
            "  DATABASE_URL = Supabase *pooled* URI (port 6543), add ?sslmode=require&pgbouncer=true if needed",
            "  AUTH_SECRET = openssl rand -base64 32",
            "  NEXTAUTH_URL = https://<your-deployment>.vercel.app (exact URL, https, no trailing path)",
            "Migrations run automatically on Vercel build (prisma migrate deploy). If a migration failed, check build logs.",
            "Ensure DATABASE_URL is available to the Build step in Vercel (same as Production).",
          ],
    },
    { status: ok ? 200 : 503 }
  );
}
